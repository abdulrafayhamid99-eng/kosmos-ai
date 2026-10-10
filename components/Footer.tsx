'use client';

import React from 'react';
import Link from 'next/link';
import { Film, Sparkles, Activity, ShieldCheck, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-900 bg-slate-950/90 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-900">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-500 text-white">
                <Film className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white font-display">
                KosMos <span className="text-cyan-400">AI</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              Next-Gen AI Video Upscaler & Cinematic Frame Interpolation. Synthesizing missing frames and upscaling to 8K HDR resolution powered by deep neural optical flow.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                Cluster: Online (H100 Tensor Nodes)
              </span>
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Real-ESRGAN + RIFE 4.6
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/" className="hover:text-cyan-400 transition">AI Studio Dashboard</Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-cyan-400 transition">Rendering History</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-cyan-400 transition">Credit Packages & Pricing</Link>
              </li>
            </ul>
          </div>

          {/* Legal & Safety */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Enterprise & Legal</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/about" className="hover:text-cyan-400 transition">About KosMos AI</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-cyan-400 transition">Privacy & Data Governance</Link>
              </li>
              <li className="flex items-center gap-1 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Zero-Retention Ephemeral Storage
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 KosMos AI. All rights reserved.</p>
          <p className="text-slate-600">
            Engineered for high-framerate cinematographers, VFX colorists, and digital remastering suites.
          </p>
        </div>
      </div>
    </footer>
  );
}
