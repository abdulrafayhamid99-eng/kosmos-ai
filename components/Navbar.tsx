'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Zap, Clock, CreditCard, Sparkles, PlusCircle } from 'lucide-react';
import RefillModal from './RefillModal';

export default function Navbar() {
  const pathname = usePathname();
  const [credits, setCredits] = useState<number>(100);
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);

  // Sync credits with localStorage
  useEffect(() => {
    const updateFromStorage = () => {
      const stored = localStorage.getItem('kosmos_credits');
      if (stored !== null) {
        setCredits(parseInt(stored, 10));
      } else {
        localStorage.setItem('kosmos_credits', '100');
        setCredits(100);
      }
    };

    updateFromStorage();
    window.addEventListener('kosmos_credits_changed', updateFromStorage);
    window.addEventListener('storage', updateFromStorage);

    return () => {
      window.removeEventListener('kosmos_credits_changed', updateFromStorage);
      window.removeEventListener('storage', updateFromStorage);
    };
  }, []);

  const navLinks = [
    { name: 'Studio', href: '/' },
    { name: 'History', href: '/history', icon: Clock },
    { name: 'Pricing', href: '/pricing', icon: CreditCard },
    { name: 'About', href: '/about' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-violet-600 to-emerald-400 p-[1.5px] transition group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Film className="w-5 h-5 text-cyan-400 group-hover:text-emerald-300 transition" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-display">
                  KosMos <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400">AI</span>
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  v2.6
                </span>
              </div>
              <span className="hidden md:block text-[10px] text-slate-400 tracking-wide">
                Next-Gen AI Video Upscaler & Interpolation
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 text-xs font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5" />}
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Credits & Refill Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Credits Pill */}
            <div
              onClick={() => setShowRefillModal(true)}
              role="button"
              tabIndex={0}
              title="Click to manage credits"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition shadow-inner group"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/30 group-hover:scale-110 transition" />
              <div className="flex items-baseline gap-1 text-xs">
                <span className="font-bold text-white">{credits}</span>
                <span className="text-[11px] text-slate-400">credits</span>
              </div>
            </div>

            {/* Refill Button */}
            <button
              onClick={() => setShowRefillModal(true)}
              className="relative group overflow-hidden px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-cyan-500 via-violet-600 to-emerald-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Refill Credits</span>
            </button>
          </div>

        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-around border-t border-slate-900 bg-slate-950/90 px-4 py-2 text-xs">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`py-1 px-2 rounded-lg transition ${
                  isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Refill Modal Component */}
      <RefillModal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        currentCredits={credits}
        onCreditsUpdated={(newCredits) => setCredits(newCredits)}
      />
    </>
  );
}
