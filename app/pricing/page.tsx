'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RefillModal from '@/components/RefillModal';
import { Check, Sparkles, Zap, Shield, Film, ArrowRight, HelpCircle } from 'lucide-react';

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);
  const [credits, setCredits] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kosmos_credits');
      return stored ? parseInt(stored, 10) : 100;
    }
    return 100;
  });

  const handleInstantCreditAdd = (amount: number, planName: string) => {
    const current = parseInt(localStorage.getItem('kosmos_credits') || '100', 10);
    const updated = current + amount;
    localStorage.setItem('kosmos_credits', updated.toString());
    window.dispatchEvent(new Event('kosmos_credits_changed'));
    setCredits(updated);
    alert(`🎉 Successfully credited +${amount} render credits to your KosMos AI account for ${planName}!`);
  };

  const plans = [
    {
      name: 'Starter Creator',
      tagline: 'Ideal for content creators and YouTubers',
      price: billingPeriod === 'monthly' ? '$19' : '$15',
      period: '/ month',
      creditsIncluded: 300,
      badge: null,
      accent: 'border-slate-800 hover:border-cyan-500/50',
      buttonBg: 'bg-slate-800 hover:bg-slate-700 text-white',
      features: [
        '300 Render Credits / mo',
        'Upscale up to 4K Ultra HD',
        'Frame Interpolation to 60 FPS',
        'Noise & Compression Repair',
        'Standard GPU Render Queue',
        'MP4 & WebM Web Export',
      ],
    },
    {
      name: 'Studio Pro',
      tagline: 'Engineered for video editors and commercial suites',
      price: billingPeriod === 'monthly' ? '$49' : '$39',
      period: '/ month',
      creditsIncluded: 1200,
      badge: 'Most Popular',
      accent: 'border-violet-500/80 shadow-[0_0_35px_-5px_rgba(139,92,246,0.3)]',
      buttonBg: 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-900/50',
      features: [
        '1,200 Render Credits / mo',
        'Full 8K Cinematic Neural Upscale',
        'Super Slow-Mo Interpolation (120 FPS)',
        'Real-ESRGAN Texture Reconstruction',
        'Priority NVIDIA H100 GPU Allocation',
        'Apple ProRes 422 HQ & HEVC Export',
        'Interactive Split Comparison Tool',
      ],
    },
    {
      name: 'Cinema Enterprise',
      tagline: 'For broadcast newsrooms & feature film studios',
      price: billingPeriod === 'monthly' ? '$149' : '$119',
      period: '/ month',
      creditsIncluded: 5000,
      badge: 'Unrestricted Power',
      accent: 'border-emerald-500/60 shadow-[0_0_35px_-5px_rgba(16,185,129,0.25)]',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40',
      features: [
        '5,000 Render Credits / mo',
        'Full 8K 240 FPS Extreme Interpolation',
        'Dedicated Tensor Node (Zero Waiting)',
        'Batch Video Processing API',
        'Lossless 10-bit HDR Color Preservation',
        'Custom Fine-Tuned Film Grain Models',
        '24/7 Dedicated VFX Engineer Support',
      ],
    },
  ];

  const faqs = [
    {
      q: 'How are render credits calculated?',
      a: '1 second of 1080p 60FPS video enhancement uses ~1 credit. Upscaling to 4K uses ~2 credits/sec, while ultra-dense 8K 240FPS synthesis uses ~4 credits/sec.',
    },
    {
      q: 'Do my purchased credits expire?',
      a: 'Never. All credits loaded onto your account remain active permanently until utilized in the studio.',
    },
    {
      q: 'What video formats are supported?',
      a: 'KosMos AI natively ingests MP4, MOV, MKV, WebM, and compressed WhatsApp/mobile clips. We export in pristine HEVC H.265 and ProRes 422 HQ.',
    },
    {
      q: 'Can I test before subscribing?',
      a: 'Yes! Every new studio session receives 100 free test credits, and you can generate unlimited 2-second interactive split-slider previews anytime.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Transparent GPU Compute Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-display tracking-tight leading-tight">
            Supercharge Your Video Pipeline with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400">KosMos AI</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Choose a monthly subscription plan or top up on-demand render credits anytime. No contracts, cancel anytime.
          </p>

          {/* Billing Switch */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg transition ${
                billingPeriod === 'monthly'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                billingPeriod === 'yearly'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border ${plan.accent} transition duration-300 hover:scale-[1.01]`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg">
                  {plan.badge}
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white font-display">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.tagline}</p>

                <div className="my-6 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-white font-display tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-xs text-slate-400">{plan.period}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-6 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Included Credits:</span>
                  <span className="font-bold text-cyan-400">{plan.creditsIncluded} credits/mo</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="p-0.5 rounded-full bg-cyan-500/20 text-cyan-400 mt-0.5 flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <button
                  onClick={() => handleInstantCreditAdd(plan.creditsIncluded, plan.name)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${plan.buttonBg}`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Activate {plan.name} (+{plan.creditsIncluded} Cr)</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Instant Top-Ups Banner */}
        <div className="mb-20 p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-6 cosmic-glow-cyan">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-semibold mb-2">
              <Zap className="w-3 h-3" />
              <span>Need One-Time Top-Up?</span>
            </div>
            <h3 className="text-2xl font-bold text-white font-display">Pay-As-You-Go Render Bundles</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              No recurring subscription needed. Buy on-demand GPU render compute packages that never expire.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleInstantCreditAdd(100, "100 Pack")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5"
            >
              <span>+100 Credits ($9)</span>
            </button>
            <button
              onClick={() => handleInstantCreditAdd(500, "500 Pack")}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-violet-900/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+500 Credits ($39)</span>
            </button>
            <button
              onClick={() => setShowRefillModal(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-900/30"
            >
              <span>Open Refill Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white font-display">Frequently Asked Questions</h3>
            <p className="text-xs text-slate-400 mt-1">Everything you need to know about our billing & GPU credits</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 transition hover:border-slate-700"
              >
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-xs text-slate-400 mt-2 pl-6 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />

      <RefillModal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        currentCredits={credits}
        onCreditsUpdated={(c) => setCredits(c)}
      />
    </div>
  );
}
