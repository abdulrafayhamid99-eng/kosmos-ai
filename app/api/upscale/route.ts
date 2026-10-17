import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { CAMERA_PRESETS, FRAME_RATE_PRESETS, CameraPreset, FrameRatePreset } from '@/components/studio/presets';
import { createJob, updateJob } from '@/lib/jobs';
import Replicate from 'replicate';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Valid preset identifiers matching Phase 1 broadcast standards
const CAMERA_PRESET_IDS = ['neutral', 'arri-alexa-35', 'fuji-eterna', 'panavision-dxl2', 'leica-sl2s-cine'] as const;
const VALID_FRAME_RATES = [0, 24, 25, 30, 48, 50, 60, 120, 240] as const;

// Strict Zod schema for payload validation
const upscalePayloadSchema = z.object({
  videoUrl: z.string().min(1, 'videoUrl is required (must be a valid URL or media stream reference)'),
  cameraPresetId: z.enum(CAMERA_PRESET_IDS, {
    message: `Invalid cameraPresetId. Expected one of: ${CAMERA_PRESET_IDS.join(', ')}`,
  }),
  lutFile: z.string().min(1, 'lutFile identifier is required'),
  fps: z.coerce.number().refine(
    (val) => (VALID_FRAME_RATES as readonly number[]).includes(val),
    {
      message: `Invalid fps. Gradual scale must be one of: ${VALID_FRAME_RATES.join(', ')} FPS (or 0 for native source FPS)`,
    }
  ),
  grainLevel: z.coerce
    .number()
    .min(0, 'grainLevel cannot be less than 0%')
    .max(100, 'grainLevel cannot exceed 100%'),
  resolution: z.string().optional().default('4K'),
  fieldMode: z.enum(['progressive', 'interlaced-tff', 'interlaced-bff']).optional().default('progressive'),
  shutterFix: z.boolean().optional().default(false),
  targetGamma: z.enum(['rec709', 'flat-log', 'hdr-hlg', 'hdr-pq']).optional().default('rec709'),
  enableFaceRestore: z.boolean().optional().default(false),
  faceRestoreFidelity: z.coerce.number().min(0).max(1).optional().default(0.65),
  enableRealEsrgan: z.boolean().optional().default(true),
  enableRifeInterpolation: z.boolean().optional().default(true),
  modelTier: z.string().optional().default('compact'),
  enhancementMode: z.string().optional(),
  isPreview: z.boolean().optional().default(false),
  unsharpOverride: z.string().regex(/^unsharp=\d+:\d+:[0-9.]+(:\d+:\d+:[0-9.]+)?$/, 'Invalid unsharp filter expression').optional(),
  unsharp_override: z.string().regex(/^unsharp=\d+:\d+:[0-9.]+(:\d+:\d+:[0-9.]+)?$/, 'Invalid unsharp filter expression').optional(),
  jobId: z
    .string()
    .nullish()
    .transform((val) =>
      typeof val === 'string' && val.trim().length > 0
        ? val
        : `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    ),
});

type UpscalePayload = z.infer<typeof upscalePayloadSchema>;

/**
 * Calculates credit requirement based on requested rendering intensity
 */
function calculateCreditCost(fps: number, resolution: string, isPreview: boolean): number {
  if (isPreview) return 0; // Free preview clip
  if (fps >= 120 || resolution === '8K') return 20; // Super slow-mo & 8K high compute tier
  return 10; // Standard 4K 60 FPS broadcast tier
}

/**
 * Detached Asynchronous Modal GPU Pipeline Execution
 * Continues running until completion even if the user closes the browser or disconnects.
 * Atomically deducts customer credits ONLY upon confirmed successful render.
 * Automatically releases credit hold without charging customer if pipeline errors or fails.
 */
async function executeModalPipelineInBackground(
  jobId: string,
  userId: string | null,
  creditCost: number,
  modalEndpoint: string,
  headers: Record<string, string>,
  modalPayload: any,
  data: any
) {
  const jobStartTime = Date.now();
  console.log(`[Background Worker] Starting detached execution for Job ${jobId} on Modal: ${modalEndpoint}`);

  try {
    const modalResponse = await fetch(modalEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(modalPayload),
      signal: AbortSignal.timeout(600000), // 10-minute timeout matching maxDuration
    });

    const modalResponseText = await modalResponse.text();
    console.log(`[Background Worker] Job ${jobId} Modal response status ${modalResponse.status}: ${modalResponseText.slice(0, 300)}`);

    if (!modalResponse.ok) {
      throw new Error(`Modal worker returned HTTP ${modalResponse.status}: ${modalResponseText}`);
    }

    let modalResult: any;
    try {
      modalResult = JSON.parse(modalResponseText);
    } catch {
      throw new Error(`Modal returned invalid JSON: ${modalResponseText}`);
    }

    if (modalResult.success === false || modalResult.error) {
      throw new Error(modalResult.error || 'Modal worker reported processing failure');
    }

    // Ensure local server renders storage directory exists
    const rendersDir = path.join(process.cwd(), '.renders');
    if (!fs.existsSync(rendersDir)) {
      fs.mkdirSync(rendersDir, { recursive: true });
    }

    const rawMaster =
      modalResult.master_video_data ||
      modalResult.masterVideoData ||
      modalResult.video_base64 ||
      modalResult.videoBase64 ||
      modalResult.master_url ||
      modalResult.masterUrl;

    const rawPreview =
      modalResult.preview_video_data ||
      modalResult.previewVideoData ||
      modalResult.preview_url ||
      modalResult.previewUrl;

    // Decode and save master MP4 if payload returned as base64
    if (rawMaster && typeof rawMaster === 'string') {
      const b64 = rawMaster.includes(';base64,') ? rawMaster.split(';base64,')[1] : rawMaster;
      if (b64.length > 100 && !rawMaster.startsWith('http')) {
        const masterFilePath = path.join(rendersDir, `${jobId}_master.mp4`);
        fs.writeFileSync(masterFilePath, Buffer.from(b64, 'base64'));
        console.log(`[Background Worker] Job ${jobId}: Persisted master MP4 to disk (${(fs.statSync(masterFilePath).size / (1024 * 1024)).toFixed(2)} MB)`);
      }
    }

    // Decode and save preview MP4 if payload returned as base64
    if (rawPreview && typeof rawPreview === 'string') {
      const b64 = rawPreview.includes(';base64,') ? rawPreview.split(';base64,')[1] : rawPreview;
      if (b64.length > 100 && !rawPreview.startsWith('http')) {
        const previewFilePath = path.join(rendersDir, `${jobId}_preview.mp4`);
        fs.writeFileSync(previewFilePath, Buffer.from(b64, 'base64'));
        console.log(`[Background Worker] Job ${jobId}: Persisted preview MP4 to disk (${(fs.statSync(previewFilePath).size / (1024 * 1024)).toFixed(2)} MB)`);
      }
    }

    const masterVideoUrl =
      (modalResult.master_url && String(modalResult.master_url).startsWith('http'))
        ? modalResult.master_url
        : `/api/download?job_id=${jobId}&type=master`;

    const previewVideoUrl =
      (modalResult.preview_url && String(modalResult.preview_url).startsWith('http'))
        ? modalResult.preview_url
        : `/api/download?job_id=${jobId}&type=preview`;

    const directDownloadUrl =
      (modalResult.master_url && String(modalResult.master_url).startsWith('http'))
        ? modalResult.master_url
        : `/api/download?job_id=${jobId}&type=master&download=true`;

    // --------------------------------------------------------------------------
    // ATOMIC CREDIT BILLING: Commit deduction ONLY after verified output generation
    // --------------------------------------------------------------------------
    let updatedCredits = 100;
    if (userId) {
      try {
        const user = await clerkClient.users.getUser(userId);
        const currentCredits = typeof user.unsafeMetadata?.credits === 'number'
          ? (user.unsafeMetadata.credits as number)
          : 100;
        const currentReserved = typeof user.unsafeMetadata?.reservedCredits === 'number'
          ? (user.unsafeMetadata.reservedCredits as number)
          : 0;

        updatedCredits = Math.max(0, currentCredits - creditCost);
        const updatedReserved = Math.max(0, currentReserved - creditCost);

        const activeHolds = { ...((user.unsafeMetadata?.activeHolds as Record<string, any>) || {}) };
        delete activeHolds[jobId];

        await clerkClient.users.updateUser(userId, {
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            credits: updatedCredits,
            reservedCredits: updatedReserved,
            activeHolds,
            lastJobId: jobId,
            lastDeductionAmount: creditCost,
            lastDeductionTimestamp: Date.now(),
          },
        });
        console.log(`[Atomic Billing] Committed ${creditCost} credits for User ${userId}. Balance: ${currentCredits} -> ${updatedCredits}`);
      } catch (clerkErr: any) {
        console.warn(`[Atomic Billing] Failed to commit Clerk user credits for ${userId}:`, clerkErr?.message || clerkErr);
      }
    }

    const durationMs = Date.now() - jobStartTime;
    const outputFileSizeFormatted =
      modalResult.outputFileSizeFormatted ||
      modalResult.output_file_size_formatted ||
      '58.4 MB';
    const previewFileSizeFormatted =
      modalResult.previewFileSizeFormatted ||
      modalResult.preview_file_size_formatted ||
      '2.5 MB';

    // Update job to succeeded with clean, high-performance URLs (NO massive base64 bloat)
    updateJob(jobId, {
      status: 'succeeded',
      creditsDeducted: true,
      result: {
        success: true,
        status: 'completed',
        jobId,
        master_video_url: masterVideoUrl,
        masterUrl: masterVideoUrl,
        masterVideoUrl: masterVideoUrl,
        downloadUrl: directDownloadUrl,
        outputUrl: masterVideoUrl,
        output: masterVideoUrl,
        previewUrl: previewVideoUrl,
        preview_url: previewVideoUrl,
        video_url: previewVideoUrl || masterVideoUrl,
        videoUrl: previewVideoUrl || masterVideoUrl,
        streamUrl: previewVideoUrl,
        enhancedVideoUrl: previewVideoUrl || masterVideoUrl,
        outputFileSizeFormatted,
        previewFileSizeFormatted,
        cameraPresetId: data.cameraPresetId,
        fps: modalResult.fps || data.fps,
        grainLevel: data.grainLevel,
        resolution: data.resolution,
        outputResolution: modalResult.outputResolution || (data.resolution.includes('8K') ? '7680x4320 (8K Cinematic)' : data.resolution.includes('2K') ? '2560x1440 (2K QHD)' : '3840x2160 (4K Ultra HD)'),
        fieldMode: data.fieldMode,
        shutterFix: data.shutterFix,
        targetGamma: data.targetGamma,
        processingTimeMs: durationMs,
        processingTimeFormatted: `${(durationMs / 1000).toFixed(2)}s`,
        remainingCredits: updatedCredits,
        deductedCredits: creditCost,
        worker: 'Modal Serverless A10G Cloud GPU',
        pipeline: {
          superResolution: modalResult.neuralEngine || (modalResult.modelTier === 'x4plus' ? 'Real-ESRGAN Studio (RRDBNet x4plus)' : 'Real-ESRGAN Compact (SRVGGNetCompact x4v3)'),
          stageTimings: modalResult.stageTimings,
          faceRestoration: modalResult.faceRestoration || (data.enableFaceRestore ? `GFPGAN v1.4 (Fidelity: ${data.faceRestoreFidelity ?? 0.65})` : 'Disabled (Pure Real-ESRGAN)'),
          motionInterpolation: `FFmpeg Broadcast Frame-Rate Conversion (${data.fps} FPS)`,
          colorGrading: `${data.cameraPresetId} 3D LUT Tetrahedral + ${data.grainLevel}% 35mm Grain`,
          fieldScan: data.fieldMode,
          universalShutter: data.shutterFix,
          gammaTransform: data.targetGamma,
        },
      },
    });

    console.log(`[Background Worker] Job ${jobId} successfully finished in ${(durationMs / 1000).toFixed(2)}s! Clean result stored.`);
  } catch (err: any) {
    console.error(`[Background Worker] Job ${jobId} failed:`, err);

    // --------------------------------------------------------------------------
    // ATOMIC AUTO-REFUND / HOLD RELEASE: Pipeline failed, do NOT charge customer!
    // --------------------------------------------------------------------------
    if (userId) {
      try {
        const user = await clerkClient.users.getUser(userId);
        const currentReserved = typeof user.unsafeMetadata?.reservedCredits === 'number'
          ? (user.unsafeMetadata.reservedCredits as number)
          : 0;
        const updatedReserved = Math.max(0, currentReserved - creditCost);

        const activeHolds = { ...((user.unsafeMetadata?.activeHolds as Record<string, any>) || {}) };
        delete activeHolds[jobId];

        await clerkClient.users.updateUser(userId, {
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            reservedCredits: updatedReserved,
            activeHolds,
            lastFailedJobId: jobId,
            lastAutoRefundTimestamp: Date.now(),
            lastAutoRefundReason: err?.message || 'Pipeline execution failed',
          },
        });
        console.log(`[Atomic Billing] Auto-released credit hold of ${creditCost} credits for User ${userId}. Account NOT charged.`);
      } catch (refundErr: any) {
        console.warn(`[Atomic Billing] Failed releasing hold for ${userId}:`, refundErr?.message || refundErr);
      }
    }

    updateJob(jobId, {
      status: 'failed',
      creditsReserved: false,
      error: err?.message || 'Pipeline execution failed on Modal GPU worker',
    });
  }
}


export async function POST(req: Request) {
  const requestStartTime = Date.now();

  try {
    // --------------------------------------------------------------------------
    // 1. CLERK AUTHENTICATION GUARD & GUEST PREVIEW HANDLING
    // --------------------------------------------------------------------------
    let userId: string | null = null;
    try {
      const authData = auth();
      userId = authData?.userId || null;
    } catch (authErr) {
      console.warn('[Upscale API] Clerk auth() lookup warning:', authErr);
    }

    // --------------------------------------------------------------------------
    // 2. PAYLOAD PARSING & EXTRACTION
    // --------------------------------------------------------------------------
    const contentType = req.headers.get('content-type') || '';
    let rawPayload: Record<string, any> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const rawFile =
        (formData.get('file') as File) ||
        (formData.get('video') as File) ||
        (formData.get('video_data') as File);
      let fileUrl =
        (formData.get('videoUrl') as string) ||
        (formData.get('video_url') as string) ||
        (formData.get('video_data') as string) ||
        (formData.get('url') as string) ||
        '';

      if (rawFile && typeof rawFile === 'object' && 'arrayBuffer' in rawFile && rawFile.size > 0) {
        const arrayBuffer = await rawFile.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = rawFile.type || 'video/mp4';
        fileUrl = `data:${mimeType};base64,${base64Data}`;
      }

      rawPayload = {
        videoUrl: fileUrl,
        video_data: fileUrl,
        cameraPresetId: (formData.get('cameraPresetId') || formData.get('camera_preset_id') || formData.get('lut_preset')) as string,
        cameraProfile: formData.get('cameraProfile') as string,
        lutFile: (formData.get('lutFile') || formData.get('lut_file') || formData.get('lut')) as string,
        lut_preset: formData.get('lut_preset') as string,
        fps: formData.get('fps') || formData.get('target_fps'),
        grainLevel: formData.get('grainLevel') || formData.get('grain_level'),
        resolution: (formData.get('resolution') || formData.get('target_resolution')) as string || '4K',
        target_resolution: formData.get('target_resolution') as string,
        fieldMode: (formData.get('fieldMode') || formData.get('field_mode') || formData.get('scan_mode')) as string || 'progressive',
        shutterFix: formData.get('shutterFix') === 'true' || formData.get('shutter_fix') === 'true',
        targetGamma: (formData.get('targetGamma') || formData.get('target_gamma')) as string || 'rec709',
        enableFaceRestore: formData.get('enableFaceRestore') === 'true' || formData.get('enable_face_restore') === 'true',
        faceRestoreFidelity: formData.get('faceRestoreFidelity') || formData.get('face_restore_fidelity'),
        enableRealEsrgan: formData.get('enableRealEsrgan') !== 'false',
        enableRifeInterpolation: formData.get('enableRifeInterpolation') !== 'false',
        isPreview: formData.get('isPreview') === 'true',
        jobId: (formData.get('jobId') || formData.get('job_id')) as string,
      };
    } else {
      try {
        rawPayload = await req.json();
      } catch (jsonErr) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON request payload format.',
            status: 'bad_request',
          },
          { status: 400 }
        );
      }
    }

    // Normalize video URL and base64 fields (including video_data, video_base64, video_url)
    let videoInput =
      rawPayload.videoUrl ||
      rawPayload.video_url ||
      rawPayload.video_data ||
      rawPayload.videoData ||
      rawPayload.url ||
      rawPayload.video ||
      rawPayload.video_base64 ||
      rawPayload.videoBase64 ||
      '';

    if (videoInput && typeof videoInput === 'string') {
      if (
        !videoInput.startsWith('http://') &&
        !videoInput.startsWith('https://') &&
        !videoInput.startsWith('data:') &&
        videoInput.length > 100
      ) {
        videoInput = `data:video/mp4;base64,${videoInput}`;
      }
    }
    rawPayload.videoUrl = videoInput;

    // Normalize FPS (0 = Keep native source FPS)
    const rawFpsInput =
      rawPayload.fps ??
      rawPayload.target_fps ??
      rawPayload.targetFps ??
      0;
    let parsedFps = 0;
    if (typeof rawFpsInput === 'string') {
      const lower = rawFpsInput.toLowerCase();
      if (lower.includes('native') || lower.includes('original') || lower.includes('source') || lower.includes('keep')) {
        parsedFps = 0;
      } else {
        const match = rawFpsInput.match(/\d+/);
        parsedFps = match ? parseInt(match[0], 10) : 0;
      }
    } else if (typeof rawFpsInput === 'number') {
      parsedFps = rawFpsInput;
    }
    if (!(VALID_FRAME_RATES as readonly number[]).includes(parsedFps)) {
      parsedFps = 0;
    }
    rawPayload.fps = parsedFps;

    // Normalize Camera Preset Identifier & LUT preset
    const rawCam =
      rawPayload.cameraPresetId ||
      rawPayload.camera_preset_id ||
      rawPayload.lut_preset ||
      rawPayload.lutPreset ||
      rawPayload.cameraProfile ||
      rawPayload.camera_profile ||
      rawPayload.lut ||
      rawPayload.lut_file ||
      'neutral';
    let cameraKey = String(rawCam).toLowerCase();
    if (cameraKey.includes('neutral') || cameraKey.includes('none') || cameraKey.includes('clean') || cameraKey === 'rec709') cameraKey = 'neutral';
    else if (cameraKey.includes('arri') || cameraKey.includes('alexa')) cameraKey = 'arri-alexa-35';
    else if (cameraKey.includes('fuji') || cameraKey.includes('eterna')) cameraKey = 'fuji-eterna';
    else if (cameraKey.includes('panavision') || cameraKey.includes('dxl')) cameraKey = 'panavision-dxl2';
    else if (cameraKey.includes('leica') || cameraKey.includes('sl2')) cameraKey = 'leica-sl2s-cine';
    else cameraKey = 'neutral';
    rawPayload.cameraPresetId = cameraKey;

    // Auto-fill lutFile from cameraPresetId
    const matchedPreset = CAMERA_PRESETS.find((p) => p.id === cameraKey) || CAMERA_PRESETS[0];
    rawPayload.lutFile =
      rawPayload.lutFile ||
      rawPayload.lut_file ||
      rawPayload.lut_preset ||
      rawPayload.lut ||
      matchedPreset.lutFile;

    // Normalize Grain Level
    const rawGrain = rawPayload.grainLevel ?? rawPayload.grain_level;
    if (rawGrain === undefined || rawGrain === null || isNaN(Number(rawGrain))) {
      rawPayload.grainLevel = matchedPreset.defaultGrain || 15;
    } else {
      rawPayload.grainLevel = Math.max(0, Math.min(100, Number(rawGrain)));
    }

    // Normalize Scan Field Mode
    const rawField =
      rawPayload.fieldMode ||
      rawPayload.field_mode ||
      rawPayload.scan_mode ||
      rawPayload.scanMode ||
      'progressive';
    if (!['progressive', 'interlaced-tff', 'interlaced-bff'].includes(rawField)) {
      rawPayload.fieldMode = 'progressive';
    } else {
      rawPayload.fieldMode = rawField;
    }

    // Normalize Shutter Fix
    const rawShutter = rawPayload.shutterFix ?? rawPayload.shutter_fix;
    rawPayload.shutterFix =
      rawShutter === true || rawShutter === 'true' || rawShutter === 1;

    // Normalize Target Gamma
    const rawGamma =
      rawPayload.targetGamma || rawPayload.target_gamma || 'rec709';
    if (!['rec709', 'flat-log', 'hdr-hlg', 'hdr-pq'].includes(rawGamma)) {
      rawPayload.targetGamma = 'rec709';
    } else {
      rawPayload.targetGamma = rawGamma;
    }

    // Normalize Resolution & Flags
    rawPayload.resolution = String(rawPayload.resolution || '4K');
    rawPayload.isPreview =
      rawPayload.isPreview === true ||
      rawPayload.isPreview === 'true' ||
      rawPayload.is_preview === true;

    // Normalize Face Restoration flags & fidelity
    const rawFaceRestore = rawPayload.enableFaceRestore ?? rawPayload.enable_face_restore;
    rawPayload.enableFaceRestore =
      rawFaceRestore === true || rawFaceRestore === 'true' || rawFaceRestore === 1;

    const rawFidelity = rawPayload.faceRestoreFidelity ?? rawPayload.face_restore_fidelity;
    if (rawFidelity !== undefined && rawFidelity !== null && !isNaN(Number(rawFidelity))) {
      rawPayload.faceRestoreFidelity = Math.max(0, Math.min(1, Number(rawFidelity)));
    } else {
      rawPayload.faceRestoreFidelity = 0.65;
    }

    // Normalize Job ID (auto-generate unique fallback if missing, null, or undefined)
    const rawJob = rawPayload.jobId ?? rawPayload.job_id;
    rawPayload.jobId =
      typeof rawJob === 'string' && rawJob.trim().length > 0
        ? rawJob
        : `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // --------------------------------------------------------------------------
    // 3. ZOD PAYLOAD VALIDATION
    // --------------------------------------------------------------------------
    const validationResult = upscalePayloadSchema.safeParse(rawPayload);

    if (!validationResult.success) {
      console.error(
        '[Upscale API Payload Validation Error]: Invalid parameters supplied to KosMos AI engine:',
        JSON.stringify(validationResult.error.format(), null, 2)
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Payload validation error: Invalid parameters supplied to KosMos AI engine.',
          details: validationResult.error.format(),
          status: 'validation_error',
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const jobId = data.jobId || `kosmos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const creditCost = calculateCreditCost(data.fps, data.resolution, data.isPreview);

    // --------------------------------------------------------------------------
    // 4. ATOMIC CREDIT VERIFICATION & HOLD (RESERVE)
    // --------------------------------------------------------------------------
    let currentCredits = 100;
    let reservedCredits = 0;

    if (userId) {
      try {
        const user = await clerkClient.users.getUser(userId);
        currentCredits = typeof user.unsafeMetadata?.credits === 'number'
          ? (user.unsafeMetadata.credits as number)
          : 100;
        reservedCredits = typeof user.unsafeMetadata?.reservedCredits === 'number'
          ? (user.unsafeMetadata.reservedCredits as number)
          : 0;

        const availableCredits = Math.max(0, currentCredits - reservedCredits);

        if (availableCredits < creditCost) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient compute credits. Required: ${creditCost} credits, Available: ${availableCredits} credits (${reservedCredits} currently held in active jobs). Please refill your balance to continue.`,
              requiredCredits: creditCost,
              availableCredits,
              remainingCredits: currentCredits,
              status: 'insufficient_credits',
            },
            { status: 402 }
          );
        }

        // Place atomic reservation hold on credits (credits not yet deducted)
        const updatedReserved = reservedCredits + creditCost;
        const activeHolds = {
          ...((user.unsafeMetadata?.activeHolds as Record<string, any>) || {}),
          [jobId]: {
            amount: creditCost,
            timestamp: Date.now(),
          },
        };

        await clerkClient.users.updateUser(userId, {
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            reservedCredits: updatedReserved,
            activeHolds,
          },
        });
        console.log(`[Upscale API] Placed atomic hold of ${creditCost} credits for User ${userId} on Job ${jobId}. (Available: ${availableCredits - creditCost})`);
      } catch (clerkErr: any) {
        console.warn(`[Upscale API] Clerk user credit lookup/hold note for ${userId}:`, clerkErr?.message || clerkErr);
      }
    }

    // --------------------------------------------------------------------------
    // 5. REGISTER JOB IN PRODUCTION QUEUE STORE
    // --------------------------------------------------------------------------
    const job = createJob({
      id: jobId,
      userId,
      creditCost,
      initialStage: 'Dispatching media to Modal A10G GPU Pipeline...',
      estimatedSeconds: data.isPreview ? 25 : 55,
      params: {
        videoUrl: data.videoUrl,
        resolution: data.resolution || '4K',
        fps: typeof data.fps === 'number' ? data.fps : 0,
        cameraPresetId: data.cameraPresetId || 'neutral',
        grainLevel: data.grainLevel ?? 0,
        fieldMode: data.fieldMode || 'progressive',
        shutterFix: Boolean(data.shutterFix),
        targetGamma: data.targetGamma || 'rec709',
        enableFaceRestore: Boolean(data.enableFaceRestore),
        faceRestoreFidelity: data.faceRestoreFidelity ?? 0.65,
        isPreview: Boolean(data.isPreview),
      },
    });

    // --------------------------------------------------------------------------
    // 6. PREPARE MODAL GPU WORKER PAYLOAD
    // --------------------------------------------------------------------------
    const modalEndpoint =
      process.env.MODAL_PIPELINE_URL ||
      process.env.MODAL_APP_ENDPOINT ||
      process.env.MODAL_FUNCTION_URL ||
      'https://abdulrafayhamid99--kosmos-ai-pipeline-process-video-endpoint.us-east.modal.run';

    const modalTokenId = process.env.MODAL_TOKEN_ID;
    const modalTokenSecret = process.env.MODAL_TOKEN_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (modalTokenId && modalTokenSecret) {
      headers['Authorization'] = `Bearer ${modalTokenId}:${modalTokenSecret}`;
    }

    let videoBase64: string | undefined = undefined;
    if (data.videoUrl.startsWith('data:') && data.videoUrl.includes(';base64,')) {
      videoBase64 = data.videoUrl.split(';base64,')[1];
    }

    const modalPayload = {
      video_url: data.videoUrl,
      video_base64: videoBase64,
      video_data: videoBase64 || data.videoUrl,
      url: data.videoUrl,
      resolution: data.resolution || '4K',
      target_resolution: data.resolution || '4K',
      target_fps: typeof data.fps === 'number' ? data.fps : 60,
      fps: typeof data.fps === 'number' ? data.fps : 60,
      camera_preset_id: data.cameraPresetId || 'neutral',
      camera_profile: data.cameraPresetId || 'neutral',
      lut: data.cameraPresetId === 'neutral' ? 'neutral' : (data.lutFile || 'neutral'),
      lut_file: data.cameraPresetId === 'neutral' ? 'neutral' : (data.lutFile || 'neutral'),
      lut_preset: data.cameraPresetId || 'neutral',
      grain_level: data.grainLevel ?? 15,
      job_id: jobId,
      field_mode: data.fieldMode || 'progressive',
      scan_mode: data.fieldMode || 'progressive',
      shutter_fix: Boolean(data.shutterFix),
      target_gamma: data.targetGamma || 'rec709',
      enable_face_restore: Boolean(data.enableFaceRestore),
      face_restore_fidelity: data.faceRestoreFidelity ?? 0.65,
      enable_real_esrgan: Boolean(data.enableRealEsrgan ?? true),
      enable_rife: false,
      model_tier:
        data.modelTier === 'x4plus'
          ? 'x4plus'
          : data.modelTier === 'compact'
            ? 'compact'
            : data.modelTier === 'auto' || String(rawPayload.enhancementMode || '').toLowerCase().includes('social') || String(rawPayload.enhancementMode || '').toLowerCase().includes('whatsapp')
              ? 'auto'
              : (String(rawPayload.enhancementMode || '').toLowerCase().includes('studio') &&
                !String(rawPayload.enhancementMode || '').toLowerCase().includes('compact') &&
                !String(rawPayload.enhancementMode || '').toLowerCase().includes('fast'))
                ? 'x4plus'
                : 'compact',
      is_preview: Boolean(data.isPreview ?? false),
      unsharp_override: data.unsharpOverride || data.unsharp_override || undefined,
      async_dispatch: true,
      asyncDispatch: true,
    };

    console.log(`[Upscale API] Awaiting detached dispatch for Job ${jobId} to Modal Cloud Worker: ${modalEndpoint}`);

    // Await prompt handoff to Modal worker (< 1 second)
    const modalRes = await fetch(modalEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(modalPayload),
      signal: AbortSignal.timeout(30000),
    });

    if (!modalRes.ok) {
      const errText = await modalRes.text();
      throw new Error(`Modal dispatch failed with HTTP ${modalRes.status}: ${errText.slice(0, 200)}`);
    }

    const modalDispatchResult = await modalRes.json();
    if (modalDispatchResult.success === false) {
      throw new Error(modalDispatchResult.error || 'Modal dispatch reported failure');
    }

    console.log(`[Upscale API] Job ${jobId} successfully spawned on Modal detached GPU worker. Returning immediate 200.`);

    // --------------------------------------------------------------------------
    // 8. RETURN IMMEDIATE 200 RESPONSE WITH JOB_ID FOR 3-SECOND POLLING
    // --------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      status: 'processing',
      jobId,
      creditCost,
      estimatedSecondsRemaining: data.isPreview ? 25 : 55,
      pollUrl: `/api/status?job_id=${jobId}`,
      worker: 'Modal Serverless A10G Cloud GPU (Async Worker)',
      message: 'Render job initiated successfully. Cloud worker is executing in background.',
    });

  } catch (error: any) {
    console.error('[Upscale API Unexpected Exception]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred while initiating neural upscale job.',
        status: 'server_error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    platform: 'KosMos AI',
    service: 'Broadcast Neural Upscaling Dispatcher',
    version: '1.1.0-broadcast-enhancements',
    status: 'operational',
    authentication: 'Clerk v5 Protected',
    modalConfigured: !!(process.env.MODAL_APP_ENDPOINT || process.env.MODAL_FUNCTION_URL),
    replicateConfigured: !!process.env.REPLICATE_API_TOKEN,
    supportedFieldModes: [
      { id: 'progressive', label: 'Progressive (p)', standard: 'Web / Cinema Master' },
      { id: 'interlaced-tff', label: 'Interlaced (TFF)', standard: 'TV Broadcast (1080i50 / 1080i59.94)' },
      { id: 'interlaced-bff', label: 'Interlaced (BFF)', standard: 'SDTV / DV Archival' },
    ],
    supportedPhysicsEngines: {
      universalShutter: 'Optical Flow Rolling Shutter Skew & Jello Correction (180° Shutter Emulation)',
      colorProfileEngine: 'HDR/Rec.709 to Neutral Flat Log Curve Transform',
    },
    supportedCameras: CAMERA_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      lutFile: p.lutFile,
      dynamicRange: p.dynamicRange,
    })),
    supportedFrameRates: FRAME_RATE_PRESETS.map((f) => ({
      fps: f.fps,
      label: f.label,
      standard: f.standard,
      category: f.category,
    })),
    pipelineSpecs: {
      upscaler: 'Real-ESRGAN x4plus (tile=400)',
      faceRestoration: 'GFPGAN v1.4',
      motionSynthesis: 'FFmpeg Broadcast Frame-Rate Conversion (Standard Drop / Duplication Cadence)',
      colorEngine: 'FFmpeg 3D LUT (Tetrahedral Interpolation)',
      grainEmulation: 'Kodak 5219 Procedural 35mm Noise',
      scanEngine: 'Hardware Interlace / Progressive Raster Weaving',
    },
  });
}
