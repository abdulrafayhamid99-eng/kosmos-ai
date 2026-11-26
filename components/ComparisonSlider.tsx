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
  Download
} from 'lucide-react';

interface ComparisonSliderProps {
  originalVideoSrc?: string;
  enhancedVideoSrc?: string;
  presetName?: string;
  resolution?: string;
  fps?: string;
  cameraProfile?: string;
  applyNeuralFilter?: boolean;
  hasRenderedOutput?: boolean;
  isRenderPreview?: boolean;
  outputFileSize?: string;
  onExport?: () => void;
}

export default function ComparisonSlider({
  originalVideoSrc,
  enhancedVideoSrc,
  resolution = "4K Ultra HD",
  fps = "60 FPS",
  hasRenderedOutput = false,
  isRenderPreview = false,
  outputFileSize,
  onExport,
}: ComparisonSliderProps) {
  // Default verified sample video
  const defaultSampleUrl = "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4";
  const sourceA = originalVideoSrc || defaultSampleUrl;
  const sourceB = enhancedVideoSrc || originalVideoSrc || defaultSampleUrl;

  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0-100
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isDownloadingLocal, setIsDownloadingLocal] = useState<boolean>(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoBeforeRef = useRef<HTMLVideoElement | null>(null);
  const videoAfterRef = useRef<HTMLVideoElement | null>(null);

  // ResizeObserver to track container width for perfect pixel alignment
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => updateSize());
      resizeObserver.observe(containerRef.current);
    } else {
      window.addEventListener('resize', updateSize);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // 1. Strict Frame-by-Frame Synchronization Loop via requestAnimationFrame
  useEffect(() => {
    let animId: number;
    const syncLoop = () => {
      const primary = videoAfterRef.current;
      const secondary = videoBeforeRef.current;

      if (primary && secondary) {
        setCurrentTime(primary.currentTime);

        // Strict drift correction
        const drift = Math.abs(primary.currentTime - secondary.currentTime);
        if (drift > 0.03) {
          secondary.currentTime = primary.currentTime;
        }

        // 5-Second Preview Loop restriction: strictly loops 0:00 - 0:05
        if (isRenderPreview && primary.currentTime >= 5.0) {
          primary.currentTime = 0;
          secondary.currentTime = 0;
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
      setDuration(isRenderPreview ? 5 : (videoAfterRef.current.duration || 0));
      const w = videoAfterRef.current.videoWidth;
      const h = videoAfterRef.current.videoHeight;
      if (w && h) {
        setVideoAspectRatio(`${w} / ${h}`);
      }
    }
  };

  const handleBeforeLoadedMetadata = () => {
    if (videoBeforeRef.current && !videoAspectRatio) {
      const w = videoBeforeRef.current.videoWidth;
      const h = videoBeforeRef.current.videoHeight;
      if (w && h) {
        setVideoAspectRatio(`${w} / ${h}`);
      }
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

  // Reset and play videos immediately on source changes
  useEffect(() => {
    if (videoBeforeRef.current) {
      videoBeforeRef.current.load();
      videoBeforeRef.current.currentTime = 0;
      videoBeforeRef.current.playbackRate = playbackSpeed;
      videoBeforeRef.current.play().catch(() => {});
    }
    if (videoAfterRef.current) {
      videoAfterRef.current.load();
      videoAfterRef.current.currentTime = 0;
      videoAfterRef.current.playbackRate = playbackSpeed;
      videoAfterRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
  }, [sourceA, sourceB, playbackSpeed]);

  const handleInternalExport = async () => {
    if (onExport) {
      onExport();
      return;
    }

    if (!hasRenderedOutput || !enhancedVideoSrc || enhancedVideoSrc === sourceA) {
      alert('AI Rendering Required: Please render your video preview or full resolution master first before exporting.');
      return;
    }

    setIsDownloadingLocal(true);
    const filename = `KosMos_Enhanced_${resolution.replace(/\s+/g, '_')}_${fps.replace(/\s+/g, '_')}.mp4`;

    try {
      // 1. Direct blob fetch
      const response = await fetch(sourceB, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 1024) {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
          return;
        }
      }
      throw new Error('Direct fetch failed');
    } catch {
      // 2. Direct anchor fallback
      const a = document.createElement('a');
      a.href = sourceB;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloadingLocal(false);
    }
  };

  const formatTime = (timeInSec: number) => {
    const clamped = Math.max(0, timeInSec);
    const mins = Math.floor(clamped / 60);
    const secs = Math.floor(clamped % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Sync duration and position whenever isRenderPreview changes
  useEffect(() => {
    if (isRenderPreview) {
      setDuration(5);
      if (videoAfterRef.current && videoAfterRef.current.currentTime >= 5.0) {
        videoAfterRef.current.currentTime = 0;
      }
      if (videoBeforeRef.current && videoBeforeRef.current.currentTime >= 5.0) {
        videoBeforeRef.current.currentTime = 0;
      }
      setCurrentTime(0);
    }
  }, [isRenderPreview]);

  // Native onTimeUpdate listener: Clamps playback strictly to 0:00 - 0:05 in preview mode
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    if (isRenderPreview && vid.currentTime >= 5.0) {
      vid.currentTime = 0;
      if (videoAfterRef.current) videoAfterRef.current.currentTime = 0;
      if (videoBeforeRef.current) videoBeforeRef.current.currentTime = 0;
      setCurrentTime(0);
    } else {
      setCurrentTime(vid.currentTime);
    }
  };

  // Timeline scrubber seek handler
  const handleSeekTimeline = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVal = parseFloat(e.target.value);
    const clamped = isRenderPreview ? Math.min(5, Math.max(0, targetVal)) : targetVal;
    if (videoAfterRef.current) videoAfterRef.current.currentTime = clamped;
    if (videoBeforeRef.current) videoBeforeRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Timeline boundaries restricted to 5s in preview mode
  const effectiveMaxDuration = isRenderPreview ? 5 : (duration > 0 ? duration : 5);
  const effectiveCurrentTime = isRenderPreview ? Math.min(5, Math.max(0, currentTime)) : currentTime;

  return (
    <div className="w-full flex flex-col gap-2.5">
      
      <div className="flex justify-between gap-3 text-sm font-medium text-slate-300">
        <span>Original</span>
        <span>{hasRenderedOutput ? 'Rendered output' : 'Awaiting render'}</span>
      </div>

      {/* Main Interactive Split Container (Dynamically matches video aspect ratio with object-contain & black backdrop) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={(e) => {
          setIsDragging(true);
          if (e.touches && e.touches[0]) updateSliderPos(e.touches[0].clientX);
        }}
        style={{
          aspectRatio: videoAspectRatio || '16 / 9',
          maxHeight: 'min(72vh, 660px)',
        }}
        className="relative w-full mx-auto rounded-2xl overflow-hidden bg-black select-none border border-slate-800 shadow-2xl cursor-ew-resize cosmic-border-glow flex items-center justify-center"
      >
        {/* Layer 1: Enhanced Video (Full Base Layer with object-contain) */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
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
            onTimeUpdate={handleTimeUpdate}
            style={{
              filter: 'none',
            }}
            className="w-full h-full object-contain transition-[filter] duration-150"
          />

        </div>

        {/* Layer 2: Original Video (Clipped Layer - 100% True 1:1 Pixel Fidelity, Zero Blur, Zero Artificial Filters) */}
        <div
          className="absolute inset-0 h-full overflow-hidden pointer-events-none bg-black"
          style={{ width: `${sliderPosition}%` }}
        >
          <div
            className="absolute top-0 left-0 h-full flex items-center justify-center bg-black"
            style={{
              width: containerWidth > 0 ? `${containerWidth}px` : (containerRef.current ? `${containerRef.current.clientWidth}px` : '100%'),
              minWidth: containerWidth > 0 ? `${containerWidth}px` : (containerRef.current ? `${containerRef.current.clientWidth}px` : '100%'),
            }}
          >
            <video
              ref={videoBeforeRef}
              src={sourceA}
              autoPlay
              loop
              muted
              playsInline
              onLoadedMetadata={handleBeforeLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              style={{
                filter: 'none',
              }}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Raw Input Badge (Top Left) */}

        </div>

        {/* Draggable Divider Handle Line */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Vertical Glowing Cyan Line */}
          <div className="w-[2px] h-full bg-gradient-to-b from-cyan-400 via-white to-cyan-400 shadow-[0_0_18px_rgba(6,182,212,1)] -ml-[1px]" />

          {/* Center Circular Grab Button */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-900 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center shadow-xl shadow-cyan-500/70 backdrop-blur-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
            <SlidersHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </div>
        </div>

        {/* Desktop Interactive Bottom Controls Overlay (md+) */}
        <div className="hidden md:flex absolute bottom-0 inset-x-0 z-20 px-3 py-2.5 bg-gradient-to-t from-black/95 via-black/85 to-transparent flex-col gap-1.5 text-white text-xs pointer-events-auto">
          
          {/* Timeline Scrubber & Timestamp Row (Restricted strictly to 5s in preview mode) */}
          <div className="w-full flex items-center gap-2.5">
            <input
              type="range"
              min={0}
              max={effectiveMaxDuration}
              step={0.05}
              value={effectiveCurrentTime}
              onChange={handleSeekTimeline}
              className="w-full h-1.5 bg-slate-800 hover:h-2 rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-all focus:outline-none"
              title={isRenderPreview ? "5s Preview Snippet (0:00 - 0:05 Loop)" : "Seek Timeline"}
            />
            <span className="text-[11px] font-mono text-cyan-300 font-bold whitespace-nowrap bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700/80 shadow-sm">
              {formatTime(effectiveCurrentTime)} / {formatTime(effectiveMaxDuration)}
            </span>
          </div>

          <div className="flex items-center justify-between">
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

              {isRenderPreview && (
                <span className="text-[10px] uppercase font-bold text-cyan-400 px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/40 rounded-full hidden sm:inline-block">
                  5s Snippet Loop
                </span>
              )}
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
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold shadow-md transition disabled:opacity-75 ${
                  hasRenderedOutput
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-cyan-900/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title={
                  hasRenderedOutput
                    ? `Download processed ${isRenderPreview ? 'preview' : resolution} video`
                    : 'Render video first to export processed AI clip'
                }
              >
                <Download className={`w-3 h-3 ${hasRenderedOutput ? 'text-slate-950' : 'text-cyan-400'}`} />
                <span>
                  {isDownloadingLocal
                    ? 'Saving...'
                    : hasRenderedOutput
                    ? isRenderPreview
                      ? 'Export 5s Preview'
                      : `Export Clip (${outputFileSize || resolution})`
                    : 'Export Clip'}
                </span>
              </button>

              <span className="text-[11px] font-semibold text-cyan-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 font-mono">
                {Math.round(sliderPosition)}%
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Mobile-Only Interactive Bottom Controls Dock (< md) - Clean, Uncluttered, Accessible */}
      <div className="md:hidden w-full rounded-2xl bg-slate-950/90 border border-slate-800 p-2.5 sm:p-3 space-y-2.5 shadow-xl text-white text-xs">
        {/* Timeline row */}
        <div className="w-full flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={effectiveMaxDuration}
            step={0.05}
            value={effectiveCurrentTime}
            onChange={handleSeekTimeline}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            title={isRenderPreview ? "5s Preview Snippet (0:00 - 0:05 Loop)" : "Seek Timeline"}
          />
          <span className="text-[10px] font-mono text-cyan-300 font-bold whitespace-nowrap bg-slate-900 px-2 py-0.5 rounded border border-slate-700/80">
            {formatTime(effectiveCurrentTime)} / {formatTime(effectiveMaxDuration)}
          </span>
        </div>

        {/* Controls & Export Row */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={toggleSpeed}
              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition flex items-center gap-1 active:scale-95"
              title="Toggle playback speed"
            >
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>{playbackSpeed}x</span>
            </button>

            <button
              onClick={() => setSliderPosition(50)}
              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition flex items-center gap-1 active:scale-95"
              title="Reset divider to center"
            >
              <RefreshCcw className="w-3 h-3" />
              <span className="text-[10px]">50%</span>
            </button>
          </div>

          {/* Export Clip Button on Mobile */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] font-semibold text-cyan-400 bg-slate-900 px-1.5 py-1 rounded border border-slate-700 font-mono">
              {Math.round(sliderPosition)}%
            </span>
            <button
              onClick={handleInternalExport}
              disabled={isDownloadingLocal}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 disabled:opacity-75 ${
                hasRenderedOutput
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-cyan-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Download className={`w-3.5 h-3.5 ${hasRenderedOutput ? 'text-slate-950' : 'text-cyan-400'}`} />
              <span>
                {isDownloadingLocal
                  ? 'Saving...'
                  : hasRenderedOutput
                  ? isRenderPreview
                    ? 'Export Preview'
                    : 'Export Clip'
                  : 'Export Clip'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Helper beneath slider */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>Drag the divider to compare both videos.</span>
        <span>Drag right for Raw Input (1:1 Natural Pixels) 👉</span>
      </div>
    </div>
  );
}
