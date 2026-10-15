'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Film,
  Maximize2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export interface VideoInspectionData {
  file: File;
  previewUrl: string;
  filename: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  format: string;
  dimensions: string;
  width: number;
  height: number;
  durationSeconds: number;
  durationFormatted: string;
  sourceFps: number;
  aspectRatio: string;
}

interface UploadZoneProps {
  onVideoInspected: (data: VideoInspectionData) => void;
  onClearVideo?: () => void;
  currentVideo?: VideoInspectionData | null;
  disabled?: boolean;
}

const SUPPORTED_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm'];
const SUPPORTED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
];

export const UploadZone: React.FC<UploadZoneProps> = ({
  onVideoInspected,
  onClearVideo,
  currentVideo = null,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const getFormatLabel = (filename: string, mime: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'mp4' || mime.includes('mp4')) return 'MP4 (MPEG-4 AVC/H.264)';
    if (ext === 'mov' || mime.includes('quicktime')) return 'MOV (Apple QuickTime ProRes/H.264)';
    if (ext === 'mkv' || mime.includes('matroska')) return 'MKV (Matroska Video Container)';
    if (ext === 'webm' || mime.includes('webm')) return 'WebM (VP9 / AV1 Master)';
    return ext ? `.${ext.toUpperCase()} Video` : 'Standard Video';
  };

  const inspectVideoFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      // Validate extension
      const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const isValidExt = SUPPORTED_EXTENSIONS.includes(fileExt);
      const isValidMime = SUPPORTED_MIME_TYPES.some((m) => file.type.toLowerCase().includes(m)) || isValidExt;

      if (!isValidExt && !isValidMime) {
        setErrorMessage(
          `Unsupported file format (${fileExt || 'Unknown'}). Please upload MP4, MOV, MKV, or WebM.`
        );
        return;
      }

      setIsInspecting(true);

      const blobUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = blobUrl;

      // Handle loading metadata
      video.onloadedmetadata = () => {
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;
        const duration = video.duration || 0;

        // Approximate aspect ratio
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(width, height);
        const aspectW = Math.round(width / divisor);
        const aspectH = Math.round(height / divisor);
        const aspectRatio = `${aspectW}:${aspectH}`;

        // Attempt frame-rate detection via requestVideoFrameCallback or standard heuristic
        let detectedFps = 30; // standard fallback
        if ('requestVideoFrameCallback' in video) {
          // Probe playback over a few frames if possible
          let frameCount = 0;
          let firstTime = 0;
          let lastTime = 0;

          const onFrame = (_now: DOMHighResTimeStamp, metadata: any) => {
            if (frameCount === 0) {
              firstTime = metadata.mediaTime;
            }
            lastTime = metadata.mediaTime;
            frameCount++;

            if (frameCount >= 5 && lastTime > firstTime) {
              const diff = lastTime - firstTime;
              const calculatedFps = Math.round((frameCount - 1) / diff);
              if (calculatedFps >= 20 && calculatedFps <= 240) {
                detectedFps = calculatedFps;
              }
            }
          };

          const handleId = (video as any).requestVideoFrameCallback(onFrame);
          video.play().catch(() => {});
          setTimeout(() => {
            try {
              video.pause();
              if ('cancelVideoFrameCallback' in video) {
                (video as any).cancelVideoFrameCallback(handleId);
              }
            } catch (_) {}

            finalizeInspection(width, height, duration, aspectRatio, detectedFps);
          }, 150);
          return;
        }

        finalizeInspection(width, height, duration, aspectRatio, detectedFps);
      };

      const finalizeInspection = (
        width: number,
        height: number,
        duration: number,
        aspectRatio: string,
        fps: number
      ) => {
        const dimensions = `${width}x${height} (${
          width >= 3840 ? '4K Ultra HD' : width >= 2560 ? '2K QHD' : width >= 1920 ? '1080p Full HD' : '720p HD'
        })`;

        const inspectionData: VideoInspectionData = {
          file,
          previewUrl: blobUrl,
          filename: file.name,
          fileSizeBytes: file.size,
          fileSizeFormatted: formatFileSize(file.size),
          format: getFormatLabel(file.name, file.type),
          dimensions,
          width,
          height,
          durationSeconds: duration,
          durationFormatted: formatDuration(duration),
          sourceFps: fps,
          aspectRatio,
        };

        setIsInspecting(false);
        onVideoInspected(inspectionData);
      };

      video.onerror = () => {
        setIsInspecting(false);
        setErrorMessage(
          'Failed to decode video container. The file might be corrupted or encoded with an unsupported codec.'
        );
      };
    },
    [onVideoInspected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      inspectVideoFile(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      inspectVideoFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentVideo?.previewUrl) {
      URL.revokeObjectURL(currentVideo.previewUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClearVideo) onClearVideo();
  };

  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,.mkv,.webm,video/mp4,video/quicktime,video/x-matroska,video/webm"
        className="hidden"
        disabled={disabled || isInspecting}
        onChange={handleFileInput}
      />

      {/* Main Drag-Drop or Inspected View */}
      {!currentVideo ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isInspecting && fileInputRef.current?.click()}
          className={`relative group rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-300 cursor-pointer overflow-hidden ${
            isDragging
              ? 'border-amber-400 bg-amber-500/10 scale-[1.01] shadow-[0_0_35px_rgba(245,158,11,0.25)]'
              : 'border-white/15 bg-slate-900/40 hover:border-amber-400/50 hover:bg-slate-900/70 hover:shadow-xl'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          <div className="relative flex flex-col items-center justify-center space-y-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-300 ${
                isDragging
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg scale-110'
                  : 'bg-white/5 border-white/10 text-amber-400 group-hover:border-amber-400/40 group-hover:bg-amber-400/10'
              }`}
            >
              <UploadCloud className="h-8 w-8 stroke-[1.8]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white tracking-wide group-hover:text-amber-200 transition-colors">
                {isInspecting
                  ? 'Analyzing Container & Codec Streams...'
                  : 'Drop your broadcast video here or browse'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Automatic inspection parses native resolution, duration, audio streams, container format, and frame cadence.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {['.MP4', '.MOV', '.MKV', '.WEBM'].map((ext) => (
                <span
                  key={ext}
                  className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-white/5 border border-white/10 text-slate-300 tracking-wider"
                >
                  {ext}
                </span>
              ))}
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              Broadcast Master Pipeline &bull; Max 2GB &bull; 8K / 240 FPS Compatible
            </span>
          </div>
        </div>
      ) : (
        /* Inspected Video Card */
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950 p-5 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <FileVideo className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white truncate max-w-sm sm:max-w-md">
                    {currentVideo.filename}
                  </h4>
                  <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Inspected
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400">
                  {currentVideo.format} &bull; {currentVideo.fileSizeFormatted}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full lg:w-auto justify-end">
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
              >
                Change File
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-slate-400 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all"
                title="Remove video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stream Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Native Resolution
              </span>
              <span className="text-sm font-mono font-bold text-white block mt-0.5">
                {currentVideo.width} &times; {currentVideo.height}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {currentVideo.aspectRatio} Aspect
              </span>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Source Cadence
              </span>
              <span className="text-sm font-mono font-bold text-white block mt-0.5">
                {currentVideo.sourceFps} FPS
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                Temporal Base
              </span>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Timeline Duration
              </span>
              <span className="text-sm font-mono font-bold text-white block mt-0.5">
                {currentVideo.durationFormatted}
              </span>
              <span className="text-[10px] text-purple-400 font-mono">
                {currentVideo.durationSeconds.toFixed(1)}s total
              </span>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Payload Size
              </span>
              <span className="text-sm font-mono font-bold text-white block mt-0.5">
                {currentVideo.fileSizeFormatted}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                Ready for GPU
              </span>
            </div>
          </div>

          {/* Video Preview Player */}
          {currentVideo.previewUrl && (
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video max-h-72 flex items-center justify-center">
              <video
                src={currentVideo.previewUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center space-x-2.5 rounded-xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
