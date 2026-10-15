'use client';

// User credits and guest preview management

export const DEFAULT_USER_CREDITS = 100;

export function getUserCredits(userId?: string | null): number {
  if (typeof window === 'undefined') return DEFAULT_USER_CREDITS;

  if (userId) {
    const key = `kosmos_credits_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const val = parseInt(stored, 10);
      return isNaN(val) ? DEFAULT_USER_CREDITS : val;
    }
    // Check if there are legacy credits
    const legacy = localStorage.getItem('kosmos_credits');
    const initialCredits = legacy ? parseInt(legacy, 10) : DEFAULT_USER_CREDITS;
    localStorage.setItem(key, initialCredits.toString());
    return initialCredits;
  }

  // Fallback for general session
  const stored = localStorage.getItem('kosmos_credits');
  return stored ? parseInt(stored, 10) || DEFAULT_USER_CREDITS : DEFAULT_USER_CREDITS;
}

export function setUserCredits(credits: number, userId?: string | null): void {
  if (typeof window === 'undefined') return;

  const validCredits = Math.max(0, credits);
  if (userId) {
    localStorage.setItem(`kosmos_credits_${userId}`, validCredits.toString());
  }
  localStorage.setItem('kosmos_credits', validCredits.toString());
  window.dispatchEvent(new Event('kosmos_credits_changed'));
}

export function deductUserCredits(amount: number, userId?: string | null): number {
  const current = getUserCredits(userId);
  const remaining = Math.max(0, current - amount);
  setUserCredits(remaining, userId);
  return remaining;
}

export function addCredits(amount: number, userId?: string | null): number {
  const current = getUserCredits(userId);
  const updated = current + amount;
  setUserCredits(updated, userId);
  return updated;
}

// Atomic Credit Reservation & Hold Functions
export function getHeldCredits(userId?: string | null): number {
  if (typeof window === 'undefined') return 0;
  const key = userId ? `kosmos_held_credits_${userId}` : 'kosmos_held_credits';
  const val = parseInt(localStorage.getItem(key) || '0', 10);
  return isNaN(val) ? 0 : Math.max(0, val);
}

export function setHeldCredits(amount: number, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  const key = userId ? `kosmos_held_credits_${userId}` : 'kosmos_held_credits';
  const valid = Math.max(0, amount);
  localStorage.setItem(key, valid.toString());
  window.dispatchEvent(new Event('kosmos_credits_changed'));
}

export function getAvailableCredits(userId?: string | null): number {
  const total = getUserCredits(userId);
  const held = getHeldCredits(userId);
  return Math.max(0, total - held);
}

export function holdUserCredits(amount: number, jobId: string, userId?: string | null): boolean {
  const available = getAvailableCredits(userId);
  if (available < amount) return false;

  const currentHeld = getHeldCredits(userId);
  setHeldCredits(currentHeld + amount, userId);
  return true;
}

export function commitHeldUserCredits(amount: number, jobId: string, userId?: string | null): number {
  // Finalize deduction from total balance and release the hold
  const currentHeld = getHeldCredits(userId);
  setHeldCredits(Math.max(0, currentHeld - amount), userId);
  return deductUserCredits(amount, userId);
}

export function releaseHeldUserCredits(amount: number, jobId: string, userId?: string | null): void {
  // Release hold on failure without deducting actual balance
  const currentHeld = getHeldCredits(userId);
  setHeldCredits(Math.max(0, currentHeld - amount), userId);
}

// Guest Preview Tracking
export function hasGuestUsedPreview(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('kosmos_guest_preview_used') === 'true';
}

export function markGuestPreviewUsed(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kosmos_guest_preview_used', 'true');
  window.dispatchEvent(new Event('kosmos_guest_status_changed'));
}
