'use client';

import React from 'react';
import { Camera, Film, Sliders, Check, Sparkles, Eye, ShieldCheck, Zap } from 'lucide-react';
import { CAMERA_PRESETS, CameraPreset } from './presets';

interface CameraSelectorProps {
  selectedPresetId: string;
  onSelectPreset: (preset: CameraPreset) => void;
  grainLevel: number;
  onChangeGrain: (grain: number) => void;
  disabled?: boolean;
}

export const CameraSelector: React.FC<CameraSelectorProps> = ({
  selectedPresetId,
  onSelectPreset,
  grainLevel,
  onChangeGrain,
  disabled = false,
}) => {
  const currentPreset = CAMERA_PRESETS.find((p) => p.id === selectedPresetId) || CAMERA_PRESETS[0];

  return (
    <div className="w-full space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              Camera 3D LUT Profiles
              <span className="text-xs font-mono py-0.5 px-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                True Optical Math
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Transform standard dynamic footage into world-class cinema color science.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Active LUT:</span>
          <span className="text-xs font-mono font-medium text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/30">
            {currentPreset.lutFile}
          </span>
        </div>
      </div>

      {/* 4 Camera Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CAMERA_PRESETS.map((preset) => {
          const isSelected = preset.id === selectedPresetId;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPreset(preset)}
              className={`group relative text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                isSelected
                  ? 'border-amber-400/80 bg-gradient-to-b from-amber-950/30 via-slate-900/90 to-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/50'
                  : 'border-white/10 bg-slate-950/50 hover:border-white/25 hover:bg-slate-900/70'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* Active selection glow pill */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-slate-400 border-white/10 group-hover:border-white/20'
                    }`}
                  >
                    {preset.brand}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80 border border-white/5">
                    {preset.dynamicRange}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-amber-400/80 uppercase font-semibold">
                    {preset.badge}
                  </span>
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'border border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                </div>
              </div>

              {/* Title & Sensor info */}
              <h4 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors flex items-center gap-2">
                {preset.name}
              </h4>
              <p className="text-[11px] font-mono text-slate-400 mb-2">
                {preset.sensorModel}
              </p>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {preset.description}
              </p>

              {/* Metadata Highlights */}
              <div className="space-y-1 mb-3 pt-2 border-t border-white/5 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 text-slate-500">
                    <ShieldCheck className="h-3 w-3 text-amber-400/70" /> Roll-off:
                  </span>
                  <span className="text-slate-300 truncate max-w-[200px] text-right font-mono text-[10px]">
                    {preset.highlightRollOff}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Zap className="h-3 w-3 text-cyan-400/70" /> Foundation:
                  </span>
                  <span className="text-slate-300 truncate max-w-[200px] text-right font-mono text-[10px]">
                    {preset.colorFoundation}
                  </span>
                </div>
              </div>

              {/* Swatch Colors Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Palette Swatch
                </span>
                <div className="flex items-center space-x-1.5 p-1 rounded-md bg-black/40 border border-white/5">
                  {preset.swatchColors.map((color, idx) => (
                    <div
                      key={idx}
                      className="h-3.5 w-6 rounded-sm shadow-sm border border-white/10"
                      style={{ backgroundColor: color }}
                      title={`Grade tone ${idx + 1}: ${color}`}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 35mm Optical Film Grain Slider */}
      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Film className="h-4 w-4 text-amber-400" />
            <div>
              <span className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                35mm Optical Emulsion Grain
                <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  Kodak 5219 Emulation
                </span>
              </span>
              <p className="text-xs text-slate-400">
                Procedural organic grain overlay to break digital plastic smoothness.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {grainLevel}%
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={grainLevel}
            disabled={disabled}
            onChange={(e) => onChangeGrain(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0% (Clean Digital)</span>
            <span>25% (Subtle 35mm)</span>
            <span>50% (Organic Cinema)</span>
            <span>75% (Vintage 16mm)</span>
            <span>100% (High-ISO Raw Grain)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
