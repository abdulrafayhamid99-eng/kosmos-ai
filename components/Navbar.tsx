'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Film, Zap, Clock, CreditCard, Sparkles, PlusCircle, Sun, Moon, LogOut, User, ChevronDown, CheckCircle2 } from 'lucide-react';
import RefillModal from './RefillModal';
import GoogleAuthModal from './GoogleAuthModal';
import { getUserCredits, setUserCredits, hasGuestUsedPreview } from '@/lib/credits';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [credits, setCredits] = useState<number>(100);
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [guestPreviewUsed, setGuestPreviewUsed] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync guest preview status & user credits
  useEffect(() => {
    const updateCreditsAndGuestState = () => {
      const userId = session?.user?.email || (session?.user as any)?.id;
      const userCreds = getUserCredits(userId);
      setCredits(userCreds);
      setGuestPreviewUsed(hasGuestUsedPreview());
    };

    updateCreditsAndGuestState();

    window.addEventListener('kosmos_credits_changed', updateCreditsAndGuestState);
    window.addEventListener('kosmos_guest_status_changed', updateCreditsAndGuestState);
    window.addEventListener('storage', updateCreditsAndGuestState);

    return () => {
      window.removeEventListener('kosmos_credits_changed', updateCreditsAndGuestState);
      window.removeEventListener('kosmos_guest_status_changed', updateCreditsAndGuestState);
      window.removeEventListener('storage', updateCreditsAndGuestState);
    };
  }, [session]);

  const navLinks = [
    { name: 'Studio', href: '/' },
    { name: 'History', href: '/history', icon: Clock },
    { name: 'Pricing', href: '/pricing', icon: CreditCard },
    { name: 'About', href: '/about' },
  ];

  const userInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : session?.user?.email
    ? session.user.email.charAt(0).toUpperCase()
    : 'U';

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

          {/* User Credits & Auth Action Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button (Light / Dark Mode) */}
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

            {status === 'authenticated' && session?.user ? (
              /* Authenticated User: Active User Avatar, Credit Balance Pill, Refill */
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Credits Pill */}
                <div
                  onClick={() => setShowRefillModal(true)}
                  role="button"
                  tabIndex={0}
                  title="Click to refill render credits"
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
                  className="hidden sm:flex relative group overflow-hidden px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-cyan-500 via-violet-600 to-emerald-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Refill</span>
                </button>

                {/* User Avatar & Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 p-1 rounded-full border border-slate-700/80 bg-slate-900 hover:border-cyan-400/50 transition group"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-slate-900">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || 'User Avatar'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{userInitial}</span>
                      )}
                    </div>
                    {/* Active Online Indicator */}
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-64 p-3 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl shadow-black/80 space-y-3 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-2 py-1.5 border-b border-slate-800">
                        <p className="text-xs font-bold text-white truncate">
                          {session.user.name || 'KosMos Creator'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {session.user.email}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Google Verified Creator</span>
                        </div>
                      </div>

                      <div className="px-2 py-1 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Available Credits:</span>
                        <span className="font-bold text-cyan-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {credits}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <Link
                          href="/history"
                          onClick={() => setShowUserDropdown(false)}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2"
                        >
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Video Render History</span>
                        </Link>
                        <Link
                          href="/pricing"
                          onClick={() => setShowUserDropdown(false)}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-violet-400" />
                          <span>Subscription & Top-ups</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserDropdown(false);
                            signOut({ callbackUrl: '/' });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 text-xs font-semibold transition flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Logged-Out / Guest State: Guest Preview Pill + Sleek "Sign In with Google" Button */
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Guest Preview Status Pill */}
                <div
                  title={guestPreviewUsed ? "Free guest sample preview used. Sign in with Google to get 100 free render credits." : "Guest Mode: 1 free 5-second sample preview available"}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]"
                >
                  <span className={`w-2 h-2 rounded-full ${guestPreviewUsed ? 'bg-amber-400' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'}`} />
                  <span className="text-slate-400">
                    {guestPreviewUsed ? '1 Preview Used' : '1 Free Preview'}
                  </span>
                </div>

                {/* Sign In with Google Button */}
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="group relative overflow-hidden py-1.5 px-3 sm:px-3.5 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition flex items-center gap-2 shadow-md hover:shadow-cyan-500/20 active:scale-[0.98]"
                >
                  {/* Google "G" Logo */}
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="whitespace-nowrap">Sign In with Google</span>
                </button>
              </div>
            )}
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
        onCreditsUpdated={(newCredits) => {
          const userId = session?.user?.email || (session?.user as any)?.id;
          setUserCredits(newCredits, userId);
          setCredits(newCredits);
        }}
      />

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in with Google"
        subtitle="Sign in with Google to claim 100 free render credits & save your project history"
      />
    </>
  );
}
