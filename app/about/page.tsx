'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Film, Sparkles, Cpu, Layers, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pioneering Generative Video Engineering</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-display tracking-tight">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400">KosMos AI</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            Next-Gen AI Video Upscaler & Cinematic Frame Interpolation. Built for digital cinematographers, broadcast editors, archival remastering, and modern creators.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8">
          
          {/* Mission Card */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/90 cosmic-glow-cyan space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Cpu className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white font-display">Our Mission</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every day, post-production teams receive low-resolution footage, highly compressed smartphone video, or vintage 24fps film scans that struggle to display cleanly on modern 4K and 8K displays. KosMos AI was created to eliminate this limitation. By leveraging state-of-the-art neural optical flow models and deep generative texture synthesis, KosMos AI restores lost fidelity, eliminates compression macroblocks, and renders ultra-fluid motion up to 240 FPS.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="p-2 w-fit rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">Neural Optical Flow</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rather than primitive motion-blur blending or frame duplication, our RIFE v4.6 architecture tracks pixel velocities across micro-vectors, synthesizing authentic intermediate frames with cinema-grade smoothness.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="p-2 w-fit rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">Broadcast Quality Assurance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We adhere to rigorous color space compliance standards, guaranteeing that contrast, HDR gamma curves, and Rec.709/Rec.2020 color metadata remain completely uncorrupted.
              </p>
            </div>
          </div>

          {/* Studio CTA Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-white font-display">Experience KosMos AI Today</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enhance your first video sample in under 3 seconds directly in our interactive studio.
              </p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-900/40"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}