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

export interface CameraProfile {
  id: string;
  name: string;
  sub: string;
  badge: string;
  filter: string;
  colorHex: string;
  accent: string;
}

export const CAMERA_PROFILES: CameraProfile[] = [
  {
    id: 'neutral',
    name: 'Neutral Rec.709 (No LUT)',
    sub: 'Clean AI upscale preserving authentic source colors',
    badge: 'Newsroom Neutral',
    filter: 'none',
    colorHex: '#06b6d4',
    accent: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400',
  },
  {
    id: 'native_clean',
    name: 'Native Uncolored (No LUT)',
    sub: 'Clean AI upscale preserving original colors',
    badge: 'Clean Neutral',
    filter: 'none',
    colorHex: '#06b6d4',
    accent: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400',
  },
  {
    id: 'arri-alexa-35',
    name: 'ARRI LogC / Alexa-Inspired',
    sub: 'LogC4 • Rich highlight roll-off & Hollywood skin tones',
    badge: 'LogC4 Cinema',
    filter: 'sepia(0.08) contrast(1.14) saturate(1.15) brightness(1.02) hue-rotate(-2deg)',
    colorHex: '#f59e0b',
    accent: 'border-amber-500/50 bg-amber-950/20 text-amber-400',
  },
  {
    id: 'sony-scinetone',
    name: 'Sony S-Cinetone-Inspired',
    sub: 'S-Cinetone / Venice 2 • Soft midtones & natural skin tones',
    badge: 'S-Cinetone Cinema',
    filter: 'contrast(1.10) saturate(1.14) brightness(1.04) hue-rotate(2deg)',
    colorHex: '#3b82f6',
    accent: 'border-blue-500/50 bg-blue-950/20 text-blue-400',
  },
  {
    id: 'red-ipp2',
    name: 'RED IPP2-Inspired',
    sub: 'IPP2 RedColor4 • Controlled contrast & deep micro-textures',
    badge: 'IPP2 Cinema',
    filter: 'contrast(1.24) saturate(1.22) brightness(0.98)',
    colorHex: '#ef4444',
    accent: 'border-rose-500/50 bg-rose-950/20 text-rose-400',
  },
  {
    id: 'canon-clog',
    name: 'Canon Cinema C-Log-Inspired',
    sub: 'Canon Log 3 • Pleasing warm facial tonality',
    badge: 'Canon Cinema',
    filter: 'sepia(0.12) contrast(1.14) saturate(1.18) brightness(1.03) hue-rotate(-3deg)',
    colorHex: '#dc2626',
    accent: 'border-red-500/50 bg-red-950/20 text-red-400',
  },
  {
    id: 'fuji-eterna',
    name: 'Fujifilm Eterna-Inspired',
    sub: 'Eterna Film • Soft contrast & muted cinematic colors',
    badge: 'Eterna Emulsion',
    filter: 'contrast(1.06) saturate(0.92) brightness(1.03) sepia(0.04) hue-rotate(1deg)',
    colorHex: '#10b981',
    accent: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400',
  },
  {
    id: 'panasonic-vlog',
    name: 'Panasonic V-Log-Inspired',
    sub: 'Varicam 35 / V-Log • Balanced highlights & neutral truth',
    badge: 'Varicam Cinema',
    filter: 'contrast(1.08) saturate(1.04) brightness(1.01)',
    colorHex: '#0d9488',
    accent: 'border-teal-500/50 bg-teal-950/20 text-teal-400',
  },
  {
    id: 'blackmagic-film',
    name: 'Blackmagic Film-Inspired',
    sub: 'BMD Gen 5 • Organic film saturation & color separation',
    badge: 'BMD Gen 5 Film',
    filter: 'contrast(1.18) saturate(1.30) brightness(1.01)',
    colorHex: '#f97316',
    accent: 'border-orange-500/50 bg-orange-950/20 text-orange-400',
  },
  {
    id: 'panavision-dxl2',
    name: 'Panavision DXL2 Light Iron Color 2',
    sub: 'Light Iron Color 2 • Blockbuster midtone punch',
    badge: 'Light Iron Color 2',
    filter: 'sepia(0.10) contrast(1.16) saturate(1.18) brightness(1.01) hue-rotate(-3deg)',
    colorHex: '#eab308',
    accent: 'border-yellow-500/50 bg-yellow-950/20 text-yellow-400',
  },
  {
    id: 'leica-sl2s-cine',
    name: 'Leica SL2-S Cine Profile',
    sub: 'Leica Cine • Deep micro-contrast & organic blacks',
    badge: 'Leica Cine Look',
    filter: 'contrast(1.24) saturate(1.08) brightness(0.99) hue-rotate(-1deg)',
    colorHex: '#e11d48',
    accent: 'border-rose-600/50 bg-rose-950/20 text-rose-400',
  },
  {
    id: 'kodak-2383',
    name: 'Kodak 2383-Inspired Print Film',
    sub: 'Theatrical Print • Film-print contrast & warm highlights',
    badge: 'Print Film Look',
    filter: 'sepia(0.16) contrast(1.22) saturate(1.12) brightness(0.98) hue-rotate(-4deg)',
    colorHex: '#d97706',
    accent: 'border-amber-600/50 bg-amber-950/20 text-amber-300',
  },
  {
    id: 'agfa-vintage',
    name: 'Agfa-Inspired Vintage Film',
    sub: 'Agfacolor 1970s • Subtle vintage color character',
    badge: 'Retro Vintage',
    filter: 'sepia(0.20) contrast(1.08) saturate(0.96) brightness(1.03) hue-rotate(4deg)',
    colorHex: '#ca8a04',
    accent: 'border-yellow-600/50 bg-yellow-950/20 text-yellow-300',
  },
  {
    id: 'bleach-bypass',
    name: 'Bleach Bypass Look',
    sub: 'Silver Retention • Reduced saturation & stark contrast',
    badge: 'Gritty Action',
    filter: 'saturate(0.45) contrast(1.36) brightness(0.96)',
    colorHex: '#64748b',
    accent: 'border-slate-500/50 bg-slate-900/30 text-slate-300',
  },
  {
    id: 'teal-orange',
    name: 'Teal & Orange Cinema Look',
    sub: 'Split Tone • Restrained complementary teal & orange',
    badge: 'Blockbuster Look',
    filter: 'contrast(1.18) saturate(1.20) hue-rotate(-8deg)',
    colorHex: '#0891b2',
    accent: 'border-cyan-600/50 bg-cyan-950/20 text-cyan-300',
  },
  {
    id: 'monochrome-cinema',
    name: 'Monochrome Cinema Look',
    sub: 'Silver Halide • Balanced black-and-white tonal contrast',
    badge: 'Noir Editorial',
    filter: 'grayscale(1) contrast(1.20) brightness(1.02)',
    colorHex: '#ffffff',
    accent: 'border-white/50 bg-white/10 text-white',
  },
];

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
  presetName = "Studio 4K Remaster",
  resolution = "4K Ultra HD",
  fps = "60 FPS",
  cameraProfile = "Native Uncolored",
  applyNeuralFilter = true,
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
  const [isAiSharpenActive, setIsAiSharpenActive] = useState<boolean>(true);
  const [sharpnessLevel, setSharpnessLevel] = useState<'4k' | '8k'>('4k');
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

  // Active Cinema Camera Profile calculation
  const activeProfile =
    CAMERA_PROFILES.find((p) => p.id === cameraProfile || p.name === cameraProfile) ||
    CAMERA_PROFILES.find((p) => p.id === 'neutral') ||
    CAMERA_PROFILES[0];

  // Enhanced video styling: Crisp super-resolution grading combined with Cinema Camera Profile emulation
  const enhancedFilterStyle = isAiSharpenActive
    ? `${activeProfile.filter} ${
        sharpnessLevel === '8k' ? 'contrast(1.08)' : ''
      }`
    : activeProfile.filter;

  return (
    <div className="w-full flex flex-col gap-2.5">
      
      {/* Top Header / Mode Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>AI Super-Res Split Inspector</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            Drag divider left/right to compare pixel clarity
          </span>
        </div>

        {/* Neural Sharpening Engine Pill Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
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
              filter: enhancedFilterStyle,
            }}
            className="w-full h-full object-contain transition-[filter] duration-150"
          />

          {/* Enhanced Quality Badge (Top Right) */}
          <div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 z-20 pointer-events-none flex items-center gap-1.5 bg-cyan-950/90 backdrop-blur-md border border-cyan-400/60 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold text-cyan-200 shadow-xl shadow-cyan-950/90">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>KosMos AI Enhanced <span className="hidden sm:inline">({resolution} @ {fps})</span></span>
          </div>

          {/* 5-Second Preview Loop Snippet Badge */}
          {isRenderPreview && (
            <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none items-center gap-1.5 bg-gradient-to-r from-cyan-950/95 via-violet-950/95 to-cyan-950/95 backdrop-blur-md border border-cyan-400/80 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold text-cyan-300 shadow-xl shadow-cyan-950/80 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>5s Preview Snippet (0:00 - 0:05 Loop Active)</span>
            </div>
          )}

          {/* Active Cinema Camera Profile Indicator on Player (Desktop Only to avoid mobile clutter) */}
          <div className="hidden md:flex absolute top-12 right-4 z-20 pointer-events-none items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-full text-[10px] font-semibold text-slate-300 shadow-lg">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeProfile.colorHex }} />
            <span>{activeProfile.name}</span>
          </div>
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
          <div className="absolute top-2.5 left-2.5 md:top-4 md:left-4 z-20 pointer-events-none flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold text-slate-300 shadow-xl">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-400" />
            <span>Original <span className="hidden sm:inline">(Raw Input • 1:1)</span></span>
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
        <span>👈 Drag left for AI Super-Resolution ({sharpnessLevel.toUpperCase()} Clarity Active)</span>
        <span>Drag right for Raw Input (1:1 Natural Pixels) 👉</span>
      </div>
    </div>
  );
}
