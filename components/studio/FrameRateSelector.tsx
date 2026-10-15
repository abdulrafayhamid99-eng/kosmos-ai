'use client';

import React, { useState } from 'react';
import { Gauge, Sparkles, Check, Activity, Film, Tv, Zap, Clock } from 'lucide-react';
import { FRAME_RATE_PRESETS, FrameRatePreset, FrameRateCategory } from './presets';

interface FrameRateSelectorProps {
  selectedFps: number;
  onSelectFps: (preset: FrameRatePreset) => void;
  disabled?: boolean;
}

const CATEGORY_COLORS: Record<FrameRateCategory, { badge: string; border: string; text: string }> = {
  Cinema: {
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
  },
  Broadcast: {
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
  },
  HFR: {
    badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    border: 'border-cyan-500/40',
    text: 'text-cyan-400',
  },
  'Super Slow-Mo': {
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
  },
};

const CATEGORY_ICONS: Record<FrameRateCategory, React.ComponentType<{ className?: string }>> = {
  Cinema: Film,
  Broadcast: Tv,
  HFR: Zap,
  'Super Slow-Mo': Clock,
};

export const FrameRateSelector: React.FC<FrameRateSelectorProps> = ({
  selectedFps,
  onSelectFps,
  disabled = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | FrameRateCategory>('ALL');

  const filteredPresets = FRAME_RATE_PRESETS.filter((preset) =>
    activeFilter === 'ALL' ? true : preset.category === activeFilter
  );

  const selectedPreset = FRAME_RATE_PRESETS.find((p) => p.fps === selectedFps) || FRAME_RATE_PRESETS[0];

  return (
    <div className="w-full space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              Neural Temporal Synthesis (RIFE v4.6)
              <span className="text-xs font-mono py-0.5 px-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                Bidirectional Optical Flow
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interpolate frames with AI motion vectors from 24 up to 240 FPS without ghosting or tearing.
            </p>
          </div>
        </div>

        {/* Selected FPS Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Target Rate:</span>
          <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/40 px-3 py-1 rounded-md border border-cyan-500/30">
            {selectedPreset.label} ({selectedPreset.shutterAngle})
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
            activeFilter === 'ALL'
              ? 'bg-white/15 text-white border border-white/30 shadow'
              : 'bg-white/5 text-slate-400 border border-white/5 hover:text-white hover:bg-white/10'
          }`}
        >
          All (8 Rates)
        </button>
        {(['Cinema', 'Broadcast', 'HFR', 'Super Slow-Mo'] as FrameRateCategory[]).map((category) => {
          const Icon = CATEGORY_ICONS[category];
          const isFilterActive = activeFilter === category;
          const styling = CATEGORY_COLORS[category];

          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveFilter(category)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono border transition-all ${
                isFilterActive
                  ? `${styling.badge} ${styling.border} shadow`
                  : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="h-3 w-3" />
              {category}
            </button>
          );
        })}
      </div>

      {/* Grid of 8 Frame Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {filteredPresets.map((preset) => {
          const isSelected = preset.fps === selectedFps;
          const catStyle = CATEGORY_COLORS[preset.category];
          const CatIcon = CATEGORY_ICONS[preset.category];

          return (
            <button
              key={preset.fps}
              type="button"
              disabled={disabled}
              onClick={() => onSelectFps(preset)}
              className={`group relative text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-400/80 bg-gradient-to-b from-cyan-950/40 via-slate-900/90 to-slate-950 shadow-[0_0_24px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400/50'
                  : 'border-white/10 bg-slate-950/50 hover:border-white/25 hover:bg-slate-900/70'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${catStyle.badge}`}
                    >
                      <CatIcon className="h-2.5 w-2.5" />
                      {preset.category}
                    </span>
                    {(preset.fps === 25 || preset.fps === 50) && (
                      <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {preset.fps === 25 ? 'PAL 25p' : 'PAL 50p HFR'}
                      </span>
                    )}
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-cyan-400 text-slate-950 shadow-sm'
                        : 'border border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                </div>

                {/* Main FPS Number */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-black tracking-tight text-white group-hover:text-cyan-200 transition-colors">
                    {preset.fps}
                  </span>
                  <span className="text-xs font-mono text-cyan-400/80 font-bold">FPS</span>
                </div>

                <div className="text-[11px] font-semibold text-slate-200 mb-1 leading-snug">
                  {preset.standard}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {preset.description}
                </p>
              </div>

              {/* Shutter & Multiplier Footer */}
              <div className="pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-500">Shutter:</span>
                  <span className="text-slate-300">{preset.shutterAngle}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-500">Temporal Scale:</span>
                  <span className="text-cyan-300 font-semibold">{preset.opticalFlowMultiplier}x Optical Flow</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* RIFE Info Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950/40 p-3.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <span>
            <strong className="text-slate-200 font-medium">Neural Flow Vectoring:</strong> RIFE v4.6 generates multi-scale intermediate motion fields to synthesize sub-pixel intermediate frames.
          </span>
        </div>
        <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20 whitespace-nowrap">
          Hardware Accelerated
        </span>
      </div>
    </div>
  );
};
