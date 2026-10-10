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
  originalVideoUrl?: string;
}

export interface FileMetadata {
  name: string;
  sizeFormatted: string;
  format: string;
  durationFormatted: string;
  dimensions: string;
}
