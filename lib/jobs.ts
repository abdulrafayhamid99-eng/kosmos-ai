// lib/jobs.ts
// Production Job Queue & State Management for Decoupled Modal GPU Video Processing

export type JobStatus = 'queued' | 'processing' | 'succeeded' | 'completed' | 'failed';

export interface VideoJobResult {
  success: boolean;
  status?: string;
  jobId: string;
  video_base64?: string;
  videoBase64?: string;
  masterUrl: string;
  masterVideoUrl: string;
  masterVideoData?: string;
  downloadUrl: string;
  outputUrl: string;
  output: string;
  previewUrl: string;
  streamUrl: string;
  enhancedVideoUrl: string;
  outputFileSizeFormatted: string;
  previewFileSizeFormatted: string;
  cameraPresetId: string;
  fps: number;
  grainLevel: number;
  resolution: string;
  fieldMode: string;
  shutterFix: boolean;
  targetGamma: string;
  processingTimeMs: number;
  processingTimeFormatted: string;
  remainingCredits?: number;
  deductedCredits?: number;
  worker?: string;
  pipeline?: Record<string, any>;
  stats?: Record<string, any>;
  [key: string]: any;
}

export interface VideoJob {
  id: string;
  userId: string | null;
  status: JobStatus;
  creditCost: number;
  creditsReserved: boolean;
  creditsDeducted: boolean;
  progress: number;
  stage: string;
  estimatedSecondsRemaining: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string | null;
  result?: VideoJobResult | null;
  params: {
    videoUrl: string;
    resolution: string;
    fps: number;
    cameraPresetId: string;
    grainLevel: number;
    fieldMode: string;
    shutterFix: boolean;
    targetGamma: string;
    isPreview: boolean;
    enableFaceRestore?: boolean;
    faceRestoreFidelity?: number;
  };
}

// Global persistent in-memory job store (survives Next.js hot module reloads)
declare global {
  // eslint-disable-next-line no-var
  var __kosmos_jobs__: Map<string, VideoJob> | undefined;
}

if (!globalThis.__kosmos_jobs__) {
  globalThis.__kosmos_jobs__ = new Map<string, VideoJob>();
}

const jobStore = globalThis.__kosmos_jobs__;

export function createJob(params: {
  id: string;
  userId: string | null;
  creditCost: number;
  params: VideoJob['params'];
  initialStage?: string;
  estimatedSeconds?: number;
}): VideoJob {
  const now = Date.now();
  const job: VideoJob = {
    id: params.id,
    userId: params.userId,
    status: 'processing',
    creditCost: params.creditCost,
    creditsReserved: true,
    creditsDeducted: false,
    progress: 5,
    stage: params.initialStage || 'Job registered: Initializing Modal GPU worker...',
    estimatedSecondsRemaining: params.estimatedSeconds || (params.params.isPreview ? 25 : 55),
    createdAt: now,
    updatedAt: now,
    params: params.params,
    result: null,
    error: null,
  };

  jobStore.set(job.id, job);
  console.log(`[JobStore] Created job ${job.id} for user ${job.userId || 'guest'} (Reserved: ${job.creditCost} credits)`);
  return job;
}

export function getJob(id: string): VideoJob | null {
  const job = jobStore.get(id);
  if (!job) return null;

  // Dynamically calibrate progress & time remaining during 'processing' state if active
  if (job.status === 'processing') {
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - job.createdAt) / 1000));
    const isPreview = job.params.isPreview;
    const totalEst = isPreview ? 25 : 55;

    let calcProgress = job.progress;
    let calcStage = job.stage;

    if (elapsedSeconds <= 5) {
      calcProgress = Math.min(20, Math.round(5 + (elapsedSeconds / 5) * 15));
      calcStage = 'Streaming media into Modal A10G GPU memory (Zero disk PNG)...';
    } else if (elapsedSeconds <= 28) {
      // In-memory Real-ESRGAN pass
      const ratio = (elapsedSeconds - 5) / 23;
      calcProgress = Math.min(65, Math.round(20 + ratio * 45));
      calcStage = `Real-ESRGAN Tensor Core Super-Res: FP16 direct VRAM stream (${job.params.resolution})...`;
    } else if (elapsedSeconds <= 42) {
      // Standard broadcast frame-rate conversion
      const ratio = (elapsedSeconds - 28) / 14;
      calcProgress = Math.min(85, Math.round(65 + ratio * 20));
      calcStage = `Broadcast Frame-Rate Conversion (${job.params.fps} FPS)...`;
    } else if (elapsedSeconds <= 52) {
      // Color grading & fast encode
      const ratio = (elapsedSeconds - 42) / 10;
      calcProgress = Math.min(96, Math.round(85 + ratio * 11));
      calcStage = `Mastering: Applying ${job.params.cameraPresetId} 3D LUT, grain & Fast H.264 encode...`;
    } else {
      // Finalizing packaging (capped at 98% while still processing to prevent freezing at 99%)
      calcProgress = Math.min(98, 95 + Math.round(((elapsedSeconds - 52) / 30) * 3));
      calcStage = 'Finalizing broadcast master stream & S3 packaging...';
    }

    const remaining = Math.max(2, totalEst - elapsedSeconds);

    job.progress = Math.max(job.progress, calcProgress);
    job.stage = calcStage;
    job.estimatedSecondsRemaining = remaining;
    job.updatedAt = Date.now();
  }

  return job;
}

export function updateJob(id: string, updates: Partial<VideoJob>): VideoJob | null {
  const existing = jobStore.get(id);
  if (!existing) return null;

  const updated: VideoJob = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  if (updates.status === 'succeeded' || updates.status === 'completed' || updates.status === 'failed') {
    updated.completedAt = Date.now();
    if (updates.status === 'succeeded' || updates.status === 'completed') {
      updated.progress = 100;
      updated.estimatedSecondsRemaining = 0;
      updated.stage = 'Enhancement complete! Video ready for export.';
    }
  }

  jobStore.set(id, updated);
  return updated;
}

export function listJobsForUser(userId: string): VideoJob[] {
  const list: VideoJob[] = [];
  Array.from(jobStore.values()).forEach((job) => {
    if (job.userId === userId) {
      list.push(job);
    }
  });
  return list.sort((a, b) => b.createdAt - a.createdAt);
}
