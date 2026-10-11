'use client';

import React from 'react';
import Link from 'next/link';
import { X, Sparkles, Clock, ArrowRight, ShieldAlert, Zap } from 'lucide-react';

interface QuotaExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetsInFormatted?: string;
  onUpgradeClick?: () => void;
}

export default function QuotaExhaustedModal({
  isOpen,
  onClose,
  resetsInFormatted = '24 hours',
  onUpgradeClick,
}: QuotaExhaustedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl shadow-rose-950/40 space-y-6 text-slate-100">
        
        {/* Header with Icon and Close Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1">
                Daily Free Limit Reached
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white font-display">
                3 of 3 Free Clips Used
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Notice Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-200 leading-relaxed">
            You have used your <strong>3 free clips (10s each)</strong> for today. Resets in 24 hours or upgrade to continue.
          </p>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Next automatic reset:</span>
            </span>
            <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              {resetsInFormatted}
            </span>
          </div>
        </div>

        {/* Plan Comparison Summary */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Free Daily Plan</span>
            <span className="font-bold text-slate-300 block mt-0.5">3 Clips / 24h</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Max 10s per clip</span>
          </div>
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-950/40 to-violet-950/40 border border-cyan-500/30">
            <span className="text-[10px] text-cyan-400 block uppercase font-bold">Pro Creator</span>
            <span className="font-bold text-white block mt-0.5">Unlimited 8K</span>
            <span className="text-[11px] text-emerald-400 block mt-0.5">Full video duration</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <Link
            href="/pricing"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-violet-600 to-emerald-500 hover:opacity-95 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-[0.99]"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Upgrade to Unlimited 8K / Full Video</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-xs transition border border-slate-700/60"
          >
            Wait for 24h Auto-Reset
          </button>
        </div>

      </div>
    </div>
  );
}
