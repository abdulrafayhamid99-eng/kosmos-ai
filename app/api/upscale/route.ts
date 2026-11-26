import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'node:crypto';
import { finishRender, reserveRender } from '@/lib/studioAccount';
import { modalEndpoint, modalHeaders, supportedSource, validRenderId } from '@/lib/modalGateway';
import { z } from 'zod';
import { CAMERA_PRESETS, FRAME_RATE_PRESETS, CameraPreset, FrameRatePreset } from '@/components/studio/presets';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Valid preset identifiers matching Phase 1 broadcast standards
const CAMERA_PRESET_IDS = new Set(CAMERA_PRESETS.map((preset) => preset.id));
const VALID_FRAME_RATES = [0, 24, 25, 30, 48, 50, 60, 120, 240] as const;

// Strict Zod schema for payload validation
const upscalePayloadSchema = z.object({
  videoUrl: z.string().min(1, 'videoUrl is required (must be a valid URL or media stream reference)'),
  cameraPresetId: z.string().refine((id) => CAMERA_PRESET_IDS.has(id), 'Unsupported camera look'),
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
  modelTier: z.enum(['compact', 'x4plus', 'auto']).default('compact'),
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

/**
 * Calculates credit requirement based on requested rendering intensity
 */
function calculateCreditCost(fps: number, resolution: string, isPreview: boolean): number {
  if (isPreview) return 0; // Free preview clip
  if (fps >= 120 || resolution.toUpperCase().includes('8K')) return 20; // Super slow-mo & 8K high compute tier
  return 10; // Standard 4K 60 FPS broadcast tier
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: 'Sign in to render footage.' }, { status: 401 });

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
        const mimeType = rawFile.type.startsWith('video/') ? rawFile.type : 'video/mp4';
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
        modelTier: formData.get('modelTier') ?? formData.get('model_tier') ?? undefined,
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
    let cameraKey = String(rawCam).trim().toLowerCase();
    if (!CAMERA_PRESET_IDS.has(cameraKey)) {
      if (cameraKey.includes('neutral') || cameraKey.includes('none') || cameraKey.includes('clean') || cameraKey === 'rec709') cameraKey = 'neutral';
      else if (cameraKey.includes('arri') || cameraKey.includes('alexa')) cameraKey = 'arri-alexa-35';
      else if (cameraKey.includes('fuji') || cameraKey.includes('eterna')) cameraKey = 'fuji-eterna';
      else if (cameraKey.includes('panavision') || cameraKey.includes('dxl')) cameraKey = 'panavision-dxl2';
      else if (cameraKey.includes('leica') || cameraKey.includes('sl2')) cameraKey = 'leica-sl2s-cine';
    }
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
    const jobId = data.jobId || randomUUID();
    if (!validRenderId(jobId) || !supportedSource(data.videoUrl)) {
      return NextResponse.json({ success: false, error: 'Choose a video file or a Studio sample.' }, { status: 400 });
    }
    const creditCost = calculateCreditCost(data.fps, data.resolution, data.isPreview);
    const endpoint = modalEndpoint('dispatch');
    const headers = { ...modalHeaders(), 'Content-Type': 'application/json' };
    const accepted = (status: string, cost: number) => NextResponse.json({
      success: true, status, jobId, creditCost: cost, pollUrl: `/api/status?job_id=${jobId}`,
      estimatedSecondsRemaining: data.isPreview ? 25 : 55,
    });

    const reservation = await reserveRender(jobId, userId, creditCost, data.isPreview);
    if (reservation.state === 'insufficient') {
      return NextResponse.json({ success: false, error: 'Insufficient render credits.', requiredCredits: creditCost }, { status: 402 });
    }
    if (reservation.state === 'conflict') {
      return NextResponse.json({ success: false, error: 'Please start a new job.' }, { status: 409 });
    }
    if (reservation.state === 'existing') return accepted(reservation.render.state, reservation.render.credits);

    const modalPayload = {
      video_url: data.videoUrl,
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
      model_tier: data.modelTier,
      credit_cost: creditCost,
      is_preview: Boolean(data.isPreview ?? false),
      unsharp_override: data.unsharpOverride || data.unsharp_override || undefined,
      async_dispatch: true,
      asyncDispatch: true,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers, body: JSON.stringify(modalPayload), signal: AbortSignal.timeout(30000),
        redirect: 'error',
      });
      if (response.status >= 400 && response.status < 500) {
        await finishRender(jobId, userId, 'failed');
        return NextResponse.json({ success: false, error: 'The worker declined the render. Reserved credits were released.' }, { status: 502 });
      }
      if (response.ok) {
        const result = await response.json();
        if (result.success === false) {
          await finishRender(jobId, userId, 'failed');
          return NextResponse.json({ success: false, error: 'The worker could not queue the render.' }, { status: 502 });
        }
      }
    } catch {
      // Dispatch may have succeeded before the connection failed. Reconcile through the status route.
    }
    return accepted('processing', creditCost);
  } catch (error: any) {
    console.error('[Upscale API Unexpected Exception]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Render service unavailable. Please try again.',
        status: 'server_error',
      },
      { status: 503 }
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
