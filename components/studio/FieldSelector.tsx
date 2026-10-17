'use client';

import React from 'react';
import {
  Layers,
  Tv,
  Film,
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  Activity,
  Sliders,
  Eye,
  Camera,
} from 'lucide-react';
import { FIELD_PRESETS, FieldPreset, FieldScanMode } from './presets';

interface FieldSelectorProps {
  selectedFieldMode: FieldScanMode;
  onSelectFieldMode: (mode: FieldScanMode) => void;
  shutterFix?: boolean;
  onToggleShutterFix?: (enabled: boolean) => void;
  targetGamma?: string;
  onToggleTargetGamma?: (isFlatLog: boolean) => void;
  disabled?: boolean;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  selectedFieldMode,
  onSelectFieldMode,
  shutterFix = false,
  onToggleShutterFix,
  targetGamma = 'rec709',
  onToggleTargetGamma,
  disabled = false,
}) => {
  const isFlatLog = targetGamma === 'flat-log';

  return (
    <div className="w-full space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              Broadcast Fields & Scan Standards
              <span className="text-xs font-mono py-0.5 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                Raster Physics
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Configure raster scanning geometry for international transmission (Web, DCI, or TV 1080i).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Scan Standard:</span>
          <span className="text-xs font-mono font-medium text-emerald-300 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/30 uppercase">
            {selectedFieldMode === 'progressive'
              ? 'Progressive (1p)'
              : selectedFieldMode === 'interlaced-tff'
              ? '1080i TFF (Upper)'
              : '1080i BFF (Lower)'}
          </span>
        </div>
      </div>

      {/* 3 Field Options Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {FIELD_PRESETS.map((preset) => {
          const isSelected = preset.id === selectedFieldMode;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectFieldMode(preset.id)}
              className={`group relative text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-400/80 bg-gradient-to-b from-emerald-950/30 via-slate-900/90 to-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.18)] ring-1 ring-emerald-400/50'
                  : 'border-white/10 bg-slate-950/50 hover:border-white/25 hover:bg-slate-900/70'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/5 text-slate-400 border-white/10 group-hover:border-white/20'
                    }`}
                  >
                    {preset.badge}
                  </span>
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950 shadow-sm'
                        : 'border border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-200 transition-colors flex items-center gap-1.5 mb-1">
                  {preset.name}
                </h4>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {preset.description}
                </p>
              </div>

              {/* Standard Footer */}
              <div className="pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-500">Target Standard:</span>
                  <span className="text-slate-300 font-semibold truncate max-w-[170px] text-right">
                    {preset.standard}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Broadcast Physics & Color Science Sub-Engines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Universal Shutter (Rolling Shutter Fix) Toggle */}
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Dejudder &amp; Motion Smoothing
                  <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    Cadence Smoothing
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Temporal dejuddering filter and blend to reduce motion stutter and judder.
                </p>
              </div>
            </div>

            {/* Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={shutterFix}
              disabled={disabled || !onToggleShutterFix}
              onClick={() => onToggleShutterFix && onToggleShutterFix(!shutterFix)}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                shutterFix ? 'bg-cyan-500' : 'bg-slate-800'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  shutterFix ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5">
            <span>Status:</span>
            <span className={shutterFix ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
              {shutterFix ? 'Active (Optical Flow Skew Dejudder)' : 'Off (Native Camera Shutter)'}
            </span>
          </div>
        </div>

        {/* Convert to Flat / Log Curve Toggle */}
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Convert to Flat / Log Curve
                  <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Pre-Grade
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Converts HDR/Rec.709 into neutral low-contrast log space before 3D LUTs.
                </p>
              </div>
            </div>

            {/* Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isFlatLog}
              disabled={disabled || !onToggleTargetGamma}
              onClick={() => onToggleTargetGamma && onToggleTargetGamma(!isFlatLog)}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isFlatLog ? 'bg-amber-500' : 'bg-slate-800'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isFlatLog ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5">
            <span>Input Curve:</span>
            <span className={isFlatLog ? 'text-amber-300 font-semibold' : 'text-slate-500'}>
              {isFlatLog ? 'Neutral Flat Log Baseline (Max Latency)' : 'Standard Rec.709 Direct Matrix'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
