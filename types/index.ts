export * from './media';

export interface HistoryItem {
  id: string;
  filename: string;
  fileSizeFormatted?: string;
  originalDuration?: string;
  resolution: string;
  fps: string;
  preset: string;
  cameraProfile?: string;
  timestamp: string;
  processingTimeFormatted: string;
  videoUrl: string;
  masterUrl?: string;
  masterVideoUrl?: string;
  downloadUrl?: string;
  previewUrl?: string;
  originalVideoUrl?: string;
  userId?: string;
  userEmail?: string;
}

export interface FileMetadata {
  name: string;
  sizeFormatted: string;
  format: string;
  durationFormatted: string;
  dimensions: string;
}
