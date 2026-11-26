'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RefillModal from '@/components/RefillModal';
import { useUser } from '@clerk/nextjs';
import { useStudioBalance } from '@/lib/useStudioBalance';
import { studioPlan } from '@/lib/studioPlans';
import { Check, Sparkles, Zap, Shield, ArrowRight, HelpCircle, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PricingPage() {
  const { user } = useUser();
  const currentUserId = user?.id || null;

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { credits, refresh } = useStudioBalance(currentUserId);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('payment_status');
    if (status === 'success') {
      setNotification({ type: 'info', message: 'Credits appear after Stripe confirms payment.' });
      const timer = window.setTimeout(() => void refresh(), 1800);
      window.history.replaceState({}, '', '/pricing');
      return () => window.clearTimeout(timer);
    }
    if (status === 'cancelled') {
      setNotification({ type: 'info', message: 'Checkout was cancelled.' });
      window.history.replaceState({}, '', '/pricing');
    }
  }, [refresh]);

  const handleCheckout = async (planId: string, label: string) => {
    try {
      setLoadingPlan(label);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable.');
      window.location.assign(data.url);
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Checkout is unavailable.' });
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter Creator',
      tagline: 'Ideal for content creators and YouTubers',
      creditsIncluded: 300,
      badge: null,
      accent: 'border-slate-800 hover:border-cyan-500/50',
      buttonBg: 'bg-slate-800 hover:bg-slate-700 text-white',
      features: [
        'Upscale up to 4K Ultra HD',
        'Frame-rate conversion to 60 FPS',
        'Noise & Compression Repair',
        'H.264 MP4 export',
      ],
    },
    {
      id: 'studio',
      name: 'Studio Pro',
      tagline: 'Engineered for video editors and commercial suites',
      creditsIncluded: 1200,
      badge: 'Most Popular',
      accent: 'border-violet-500/80 shadow-[0_0_35px_-5px_rgba(139,92,246,0.3)]',
      buttonBg: 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-900/50',
      features: [
        '8K Resolution Export Dimensions',
        'Frame-Rate Conversion up to 120 FPS',
        'Real-ESRGAN Texture Enhancement',
        'H.264 MP4 master',
        'Interactive Split Comparison Tool',
      ],
    },
    {
      id: 'cinema',
      name: 'Cinema Enterprise',
      tagline: 'For broadcast newsrooms & feature film studios',
      creditsIncluded: 5000,
      badge: 'Unrestricted Power',
      accent: 'border-emerald-500/60 shadow-[0_0_35px_-5px_rgba(16,185,129,0.25)]',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40',
      features: [
        '8K Dimensions & 240 FPS Conversion Mode',
        'Broadcast Rec.709 & Flat-Log Support',
      ],
    },
  ];

  const faqs = [
    {
      q: 'How are render credits calculated?',
      a: 'A standard render costs 10 credits. An 8K render or a target of 120 FPS or higher costs 20. A short preview costs 0.',
    },
    {
      q: 'Do my purchased credits expire?',
      a: 'Never. All credits loaded onto your account remain active permanently until utilized in the studio.',
    },
    {
      q: 'What video formats are supported?',
      a: 'KosMos AI natively ingests MP4, MOV, MKV, WebM, and compressed mobile clips. We export in broadcast-standard high-bitrate H.264 MP4 with preserved audio.',
    },
    {
      q: 'Can I test before subscribing?',
      a: 'Sign in to generate a short preview before spending credits.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        
        {/* Toast / Notification Banner */}
        {notification && (
          <div className="mb-8 max-w-2xl mx-auto animate-in slide-in-from-top-4 duration-300">
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xl ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/90 border-cyan-500/40 text-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : notification.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                ) : (
                  <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                )}
                <span className="text-xs font-semibold">{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-xs text-slate-400 hover:text-white underline ml-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Secure Stripe Checkout & Instant GPU Compute</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-display tracking-tight leading-tight">
            Supercharge Your Video Pipeline with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400">KosMos AI</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Choose a monthly subscription plan or top up on-demand render credits anytime. No contracts, cancel anytime.
          </p>

          {/* Current balance indicator */}
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <span>Your Active Balance:</span>
            <strong className="text-cyan-400 font-mono font-bold">{credits === null ? 'Unavailable' : `${credits} credits`}</strong>
          </div>

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
                Annual pricing
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
                    {`$${(studioPlan(`${plan.id}-${billingPeriod}`)!.cents / 100).toLocaleString('en-US')}`}
                  </span>
                  <span className="text-xs text-slate-400">{billingPeriod === 'monthly' ? '/ month' : '/ year'}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-6 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Included Credits:</span>
                  <span className="font-bold text-cyan-400">{studioPlan(`${plan.id}-${billingPeriod}`)!.credits.toLocaleString('en-US')} credits per billing cycle</span>
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
                  onClick={() => handleCheckout(`${plan.id}-${billingPeriod}`, plan.name)}
                  disabled={loadingPlan === plan.name}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${plan.buttonBg} disabled:opacity-60`}
                >
                  {loadingPlan === plan.name ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting to Checkout...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Choose {plan.name}</span>
                    </>
                  )}
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
              No recurring subscription needed. Buy on-demand GPU render compute packages that never expire via secure Stripe checkout.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleCheckout('creator-pack', '100 Credits Pack')}
              disabled={loadingPlan === '100 Credits Pack'}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5 disabled:opacity-60"
            >
              {loadingPlan === '100 Credits Pack' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>+100 Credits ($9)</span>
            </button>
            <button
              onClick={() => handleCheckout('studio-pack', '500 Credits Pack')}
              disabled={loadingPlan === '500 Credits Pack'}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-violet-900/30 disabled:opacity-60"
            >
              {loadingPlan === '500 Credits Pack' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
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
      />
    </div>
  );
}
