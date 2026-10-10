'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('KosMos AI Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl cosmic-glow-cyan space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold font-display text-white">Something went wrong</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {error?.message || 'An unexpected error occurred while rendering the neural interface.'}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
