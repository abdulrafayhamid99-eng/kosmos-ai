'use client';

import React from 'react';
import { X, Zap, Check, Sparkles, ShieldCheck } from 'lucide-react';

interface RefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onCreditsUpdated: (newCredits: number) => void;
}

export default function RefillModal({
  isOpen,
  onClose,
  currentCredits,
  onCreditsUpdated,
}: RefillModalProps) {
  if (!isOpen) return null;

  const handleAddCredits = (amount: number, label: string) => {
    const updated = currentCredits + amount;
    localStorage.setItem('kosmos_credits', updated.toString());
    window.dispatchEvent(new Event('kosmos_credits_changed'));
    onCreditsUpdated(updated);
    alert(`Successfully added +${amount} credits (${label})! Your new balance is ${updated} credits.`);
  };

  const handleSetCredits = (amount: number) => {
    localStorage.setItem('kosmos_credits', amount.toString());
    window.dispatchEvent(new Event('kosmos_credits_changed'));
    onCreditsUpdated(amount);
    alert(`Credits reset to ${amount}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl p-6 md:p-8 bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl cosmic-glow-cyan">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-display">Refill KosMos Credits</h3>
            <p className="text-xs text-slate-400">Instant neural GPU rendering pipeline allocation</p>
          </div>
        </div>

        {/* Current Balance Bar */}
        <div className="my-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Studio Balance</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-extrabold text-cyan-400 font-display">{currentCredits}</span>
              <span className="text-xs text-slate-400">Render Credits Remaining</span>
            </div>
          </div>
          <button
            onClick={() => handleSetCredits(200)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Reset to 200
          </button>
        </div>

        {/* Credit Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          {/* Option 1 */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-cyan-500/50 flex flex-col justify-between transition group">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-cyan-400">Creator Refill</span>
              </div>
              <p className="text-2xl font-bold text-white">+100</p>
              <p className="text-[11px] text-slate-400 mt-1">~10 videos in 4K 60FPS</p>
            </div>
            <button
              onClick={() => handleAddCredits(100, "Creator Pack")}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Add +100
            </button>
          </div>

          {/* Option 2 (Popular) */}
          <div className="relative p-4 rounded-2xl bg-gradient-to-b from-slate-800/90 to-violet-950/30 border-2 border-violet-500/50 flex flex-col justify-between transition group shadow-lg shadow-violet-900/20">
            <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-violet-600 text-white rounded-full">
              Most Popular
            </span>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-violet-400">Studio Pro</span>
              </div>
              <p className="text-2xl font-bold text-white">+500</p>
              <p className="text-[11px] text-slate-400 mt-1">Full 8K & 240FPS Slow-Mo</p>
            </div>
            <button
              onClick={() => handleAddCredits(500, "Studio Pro Pack")}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-violet-900/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Add +500
            </button>
          </div>

          {/* Option 3 */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-emerald-500/50 flex flex-col justify-between transition group">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-emerald-400">Cinema Master</span>
              </div>
              <p className="text-2xl font-bold text-white">+2,000</p>
              <p className="text-[11px] text-slate-400 mt-1">Unlimited Batch Upscaling</p>
            </div>
            <button
              onClick={() => handleAddCredits(2000, "Cinema Master Pack")}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Add +2,000
            </button>
          </div>
        </div>

        {/* Info Guarantee */}
        <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Credits never expire. Instant activation on all neural cluster endpoints.</span>
        </div>

      </div>
    </div>
  );
}
