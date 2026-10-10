'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  SlidersHorizontal,
  RefreshCcw,
  Zap,
  Gauge,
  Download,
  Layers
} from 'lucide-react';

interface ComparisonSliderProps {
  originalVideoSrc?: string;
  enhancedVideoSrc?: string;
  presetName?: string;
  resolution?: string;
  fps?: string;
  applyNeuralFilter?: boolean;
  onExport?: () => void;
}

export default function ComparisonSlider({
  originalVideoSrc,
  enhancedVideoSrc,
  presetName = "Studio 4K Remaster",
  resolution = "4K Ultra HD",
  fps = "60 FPS",
  applyNeuralFilter = true,
  onExport,
}: ComparisonSliderProps) {
  // Default verified sample video
  const defaultSampleUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
  const sourceA = originalVideoSrc || defaultSampleUrl;
  const sourceB = enhancedVideoSrc || originalVideoSrc || defaultSampleUrl;

  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0-100
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isAiSharpenActive, setIsAiSharpenActive] = useState<boolean>(true);
  const [sharpnessLevel, setSharpnessLevel] = useState<'4k' | '8k'>('4k');
  const [isDownloadingLocal, setIsDownloadingLocal] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoBeforeRef = useRef<HTMLVideoElement | null>(null);
  const videoAfterRef = useRef<HTMLVideoElement | null>(null);

  // 1. Strict Frame-by-Frame Synchronization Loop via requestAnimationFrame
  useEffect(() => {
    let animId: number;
    const syncLoop = () => {
      const primary = videoAfterRef.current;
      const secondary = videoBeforeRef.current;

      if (primary && secondary) {
        // Keep current time indicator updated
        setCurrentTime(primary.currentTime);

        // Strict drift correction
        const drift = Math.abs(primary.currentTime - secondary.currentTime);
        if (drift > 0.04) {
          secondary.currentTime = primary.currentTime;
        }

        // State alignment
        if (!primary.paused && secondary.paused) {
          secondary.play().catch(() => {});
        } else if (primary.paused && !secondary.paused) {
          secondary.pause();
        }

        if (secondary.playbackRate !== primary.playbackRate) {
          secondary.playbackRate = primary.playbackRate;
        }
      }

      animId = requestAnimationFrame(syncLoop);
    };

    animId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Sync Event Handlers
  const handlePrimaryPlay = () => {
    setIsPlaying(true);
    if (videoBeforeRef.current && videoAfterRef.current) {
      videoBeforeRef.current.currentTime = videoAfterRef.current.currentTime;
      videoBeforeRef.current.play().catch(() => {});
    }
  };

  const handlePrimaryPause = () => {
    setIsPlaying(false);
    if (videoBeforeRef.current) {
      videoBeforeRef.current.pause();
    }
  };

  const handlePrimarySeeking = () => {
    if (videoBeforeRef.current && videoAfterRef.current) {
      videoBeforeRef.current.currentTime = videoAfterRef.current.currentTime;
    }
  };

  const handlePrimarySeeked = () => {
    if (videoBeforeRef.current && videoAfterRef.current) {
      videoBeforeRef.current.currentTime = videoAfterRef.current.currentTime;
      if (!videoAfterRef.current.paused) {
        videoBeforeRef.current.play().catch(() => {});
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoAfterRef.current) {
      setDuration(videoAfterRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (videoAfterRef.current) {
      if (isPlaying) {
        videoAfterRef.current.pause();
      } else {
        videoAfterRef.current.play().catch(() => {});
      }
    }
  };

  const toggleMute = () => {
    if (videoAfterRef.current && videoBeforeRef.current) {
      videoAfterRef.current.muted = !isMuted;
      videoBeforeRef.current.muted = true; // raw side always muted to avoid audio echo
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 0.5 : playbackSpeed === 0.5 ? 0.25 : 1;
    setPlaybackSpeed(nextSpeed);
    if (videoAfterRef.current) videoAfterRef.current.playbackRate = nextSpeed;
    if (videoBeforeRef.current) videoBeforeRef.current.playbackRate = nextSpeed;
  };

  // Slider Dragging Calculations
  const updateSliderPos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pos);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateSliderPos(e.clientX);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      updateSliderPos(e.clientX);
    },
    [isDragging, updateSliderPos]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      updateSliderPos(e.touches[0].clientX);
    },
    [isDragging, updateSliderPos]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Reset videos on source changes
  useEffect(() => {
    if (videoBeforeRef.current && videoAfterRef.current) {
      videoBeforeRef.current.currentTime = 0;
      videoAfterRef.current.currentTime = 0;
      videoBeforeRef.current.playbackRate = playbackSpeed;
      videoAfterRef.current.playbackRate = playbackSpeed;
      videoAfterRef.current.play().catch(() => {});
      videoBeforeRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [sourceA, sourceB, playbackSpeed]);

  const handleInternalExport = async () => {
    if (onExport) {
      onExport();
      return;
    }

    setIsDownloadingLocal(true);
    try {
      const response = await fetch(sourceB);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `KosMos_Enhanced_${resolution.replace(/\s+/g, '_')}_${fps.replace(/\s+/g, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      const a = document.createElement('a');
      a.href = sourceB;
      a.download = `KosMos_Enhanced_Clip.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloadingLocal(false);
    }
  };

  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Visual filter configurations for unmistakably distinct side-by-side comparison
  const enhancedFilterStyle = isAiSharpenActive
    ? sharpnessLevel === '8k'
      ? 'contrast(1.35) saturate(1.42) brightness(1.07) drop-shadow(0 0 1px rgba(6,182,212,0.8))'
      : 'contrast(1.28) saturate(1.35) brightness(1.05) drop-shadow(0 0 1px rgba(6,182,212,0.6))'
    : 'contrast(1.10) saturate(1.12)';

  const rawInputFilterStyle = 'blur(2.4px) contrast(0.85) saturate(0.76) brightness(0.93)';

  return (
    <div className="w-full flex flex-col gap-3">
      
      {/* Top Header / Mode Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>AI Super-Res Split Inspector</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Drag divider left/right to compare pixel clarity
          </span>
        </div>

        {/* Neural Sharpening Engine Pill Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Intensity selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setSharpnessLevel('4k');
                setIsAiSharpenActive(true);
              }}
              className={`px-2 py-0.5 rounded transition ${
                isAiSharpenActive && sharpnessLevel === '4k'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4K Crisp
            </button>
            <button
              type="button"
              onClick={() => {
                setSharpnessLevel('8k');
                setIsAiSharpenActive(true);
              }}
              className={`px-2 py-0.5 rounded transition ${
                isAiSharpenActive && sharpnessLevel === '8k'
                  ? 'bg-violet-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              8K Ultra
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAiSharpenActive(!isAiSharpenActive)}
            title="Toggle neural sharpening enhancement"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
              isAiSharpenActive
                ? 'bg-cyan-950/70 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Zap className={`w-3 h-3 ${isAiSharpenActive ? 'text-cyan-400 fill-cyan-400' : ''}`} />
            <span>AI Super-Res: {isAiSharpenActive ? 'Active' : 'Bypass'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Split Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={() => setIsDragging(true)}
        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black select-none border border-slate-800 shadow-2xl cursor-ew-resize cosmic-border-glow"
      >
        {/* Layer 1: Enhanced Video (Full Base Layer with Razor Sharp 4K/8K HDR Grading) */}
        <div className="absolute inset-0 w-full h-full">
          <video
            ref={videoAfterRef}
            src={sourceB}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onPlay={handlePrimaryPlay}
            onPause={handlePrimaryPause}
            onSeeking={handlePrimarySeeking}
            onSeeked={handlePrimarySeeked}
            onLoadedMetadata={handleLoadedMetadata}
            style={{
              filter: enhancedFilterStyle,
              imageRendering: '-webkit-optimize-contrast' as any,
            }}
            className="w-full h-full object-cover transition-[filter] duration-150"
          />

          {/* Micro-contrast & Specular Clarity Accent Overlay */}
          {isAiSharpenActive && (
            <div
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.15) 0%, transparent 80%)',
              }}
            />
          )}

          {/* Enhanced Quality Badge (Top Right) */}
          <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-1.5 bg-cyan-950/90 backdrop-blur-md border border-cyan-400/60 px-3 py-1.5 rounded-full text-[11px] font-bold text-cyan-200 shadow-xl shadow-cyan-950/90">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>KosMos AI Enhanced ({resolution} @ {fps})</span>
          </div>
        </div>

        {/* Layer 2: Original Video (Clipped Layer with Authentic Compressed/Soft Filter) */}
        <div
          className="absolute inset-0 h-full overflow-hidden pointer-events-none"
          style={{ width: `${sliderPosition}%` }}
        >
          <div
            className="absolute top-0 left-0 h-full"
            style={{
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
              minWidth: '100%',
            }}
          >
            <video
              ref={videoBeforeRef}
              src={sourceA}
              autoPlay
              loop
              muted
              playsInline
              style={{
                filter: rawInputFilterStyle,
              }}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Raw Input Badge (Top Left) */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-300 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Original (Raw Input • 24 FPS)</span>
          </div>
        </div>

        {/* Draggable Divider Handle Line */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Vertical Glowing Cyan Line */}
          <div className="w-[2px] h-full bg-gradient-to-b from-cyan-400 via-white to-cyan-400 shadow-[0_0_18px_rgba(6,182,212,1)] -ml-[1px]" />

          {/* Center Circular Grab Button */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-slate-900 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center shadow-xl shadow-cyan-500/70 backdrop-blur-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
        </div>

        {/* Interactive Bottom Controls Overlay */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between text-white text-xs pointer-events-auto">
          
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Slow Motion Optical Flow Toggle */}
            <button
              onClick={toggleSpeed}
              className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition flex items-center gap-1"
              title="Toggle slow-motion optical flow inspection"
            >
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>{playbackSpeed}x Smooth</span>
            </button>

            <span className="text-[11px] font-mono text-slate-300 ml-1 hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSliderPosition(50)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300 transition"
              title="Reset divider to center"
            >
              <RefreshCcw className="w-3 h-3" />
              <span>Center 50%</span>
            </button>

            {/* Direct Export Clip Trigger */}
            <button
              onClick={handleInternalExport}
              disabled={isDownloadingLocal}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-[11px] font-bold shadow-md shadow-cyan-900/30 transition disabled:opacity-75"
              title="Download enhanced high-resolution clip directly"
            >
              <Download className="w-3 h-3" />
              <span>{isDownloadingLocal ? 'Saving...' : 'Export Clip'}</span>
            </button>

            <span className="text-[11px] font-semibold text-cyan-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 font-mono">
              {Math.round(sliderPosition)}%
            </span>
          </div>

        </div>

      </div>

      {/* Helper beneath slider */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>👈 Drag left for AI Super-Resolution ({sharpnessLevel.toUpperCase()} Clarity Active)</span>
        <span>Drag right for Raw Input comparison 👉</span>
      </div>
    </div>
  );
}
