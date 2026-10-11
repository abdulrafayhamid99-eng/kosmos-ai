'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from '@clerk/nextjs';
import {
  Film,
  Zap,
  Clock,
  CreditCard,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { getDailyQuota, DailyQuotaInfo } from '@/lib/quota';

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [quota, setQuota] = useState<DailyQuotaInfo>(() =>
    getDailyQuota(user?.id, user?.unsafeMetadata)
  );
  const remainingClips = quota.clipsRemaining;

  // Sync theme with localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('kosmos_theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('kosmos_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event('kosmos_theme_changed'));
  };

  // Sync daily quota
  useEffect(() => {
    const syncQuota = () => {
      setQuota(getDailyQuota(user?.id, user?.unsafeMetadata));
    };

    syncQuota();

    window.addEventListener('kosmos_quota_changed', syncQuota);
    window.addEventListener('storage', syncQuota);

    // Refresh remaining time every minute
    const interval = setInterval(syncQuota, 60000);

    return () => {
      window.removeEventListener('kosmos_quota_changed', syncQuota);
      window.removeEventListener('storage', syncQuota);
      clearInterval(interval);
    };
  }, [user]);

  const navLinks = [
    { name: 'Studio', href: '/' },
    { name: 'History', href: '/history', icon: Clock },
    { name: 'Pricing', href: '/pricing', icon: CreditCard },
    { name: 'About', href: '/about' },
  ];

  return (
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

        {/* User Credits & Auth Action Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
            className="p-2 rounded-full border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-cyan-500" />
            )}
          </button>

          {/* Clerk Auth Section */}
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-full transition shadow">
                Sign In with Google
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-3">
              {/* Daily Free Quota Badge */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 transition text-xs shadow-inner cursor-default"
                title={`Daily Free Quota: ${remainingClips}/3 clips remaining (10s max each). Resets in ${quota.resetsInFormatted}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    remainingClips > 0
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse'
                  }`}
                />
                <span className="text-slate-300 font-semibold">
                  Clips: <strong className={remainingClips > 0 ? 'text-cyan-400 font-bold' : 'text-rose-400 font-bold'}>{remainingClips}/3 Free Today</strong>
                </span>
              </div>

              {/* Real Clerk UserButton */}
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>

      </div>
    </header>
  );
}
