/**
 * Technical Media Metadata Schema for KosMos AI
 * Distinguishes source facts, selected settings, requested output settings, and verified output properties.
 */

export interface VideoStreamMetadata {
  codecName?: string;
  codecProfile?: string;
  width: number;
  height: number;
  displayAspectRatio?: string;
  sampleAspectRatio?: string;
  pixelFormat?: string;
  bitDepth?: number;
  nominalFps?: number;
  averageFps?: number;
  isVfr?: boolean;
  frameCount?: number;
  durationSeconds?: number;
  bitrateKbps?: number;
  colorPrimaries?: string;
  colorTransfer?: string;
  colorMatrix?: string;
  colorRange?: string;
  hdrSignaling?: string;
  scanMode?: 'progressive' | 'interlaced' | 'unknown';
  fieldOrder?: 'tff' | 'bff' | 'progressive' | 'unknown';
  rotationDegrees?: number;
  sourceLutEmbedded?: string;
}

export interface AudioStreamMetadata {
  hasAudio: boolean;
  codecName?: string;
  channels?: number;
  channelLayout?: string;
  sampleRateHz?: number;
  durationSeconds?: number;
  bitrateKbps?: number;
}

export interface ContainerMetadata {
  filename: string;
  filesizeBytes: number;
  filesizeFormatted: string;
  formatName?: string;
  durationSeconds?: number;
  durationFormatted: string;
  overallBitrateKbps?: number;
  cameraMake?: string;
  cameraModel?: string;
  creationTime?: string;
}

export interface SourceMediaMetadata {
  container: ContainerMetadata;
  video: VideoStreamMetadata;
  audio: AudioStreamMetadata;
  isProbed: boolean;
  probeSource: 'browser_inspection' | 'ffprobe_backend';
}

export interface OutputQualityControlResult {
  passed: boolean;
  checks: {
    fileNonEmpty: boolean;
    videoStreamPresent: boolean;
    dimensionsMatch: boolean;
    frameRateConsistent: boolean;
    durationConsistent: boolean;
    codecMatch: boolean;
    audioConsistent: boolean;
    audioDurationWithinTolerance: boolean;
    fullDecodeVerified: boolean;
  };
  reasons: string[];
}

export interface RequestedVsActualComparison {
  resolution: {
    requested: string;
    actual: string;
    match: boolean;
  };
  frameRate: {
    requested: string;
    actual: string;
    mode: 'resampling' | 'ai_interpolation' | 'passthrough';
    match: boolean;
  };
  cameraLut: {
    requested: string;
    appliedLutName: string;
    lutType: 'camera_technical_conversion' | 'creative_look' | 'none';
    status: 'applied' | 'not_applied' | 'failed' | 'unavailable';
  };
  scanStandard: {
    requested: string;
    actual: string;
    match: boolean;
  };
  exportCodec: {
    requested: string;
    actual: string;
    match: boolean;
  };
}

export interface RenderedMediaMetadata {
  container: ContainerMetadata;
  video: VideoStreamMetadata;
  audio: AudioStreamMetadata;
  aspectRatioHandling: 'preserved' | 'padded' | 'cropped';
  comparison: RequestedVsActualComparison;
  qc: OutputQualityControlResult;
  processingTimeMs: number;
  processingTimeFormatted: string;
  workerEngine: string;
  appliedModelName?: string;
  appliedFaceRestore?: string;
  appliedMastering?: {
    unsharpFilter?: string;
    grainLevel?: number;
    shutterFixApplied?: boolean;
    gammaTransform?: string;
  };
}
