'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Film, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 w-full">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
          <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 font-display">
            404
          </span>
          <h2 className="text-lg font-bold text-white">Page Not Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The neural timeline or page you are requesting could not be located.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-lg shadow-cyan-900/30"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Studio Dashboard</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
