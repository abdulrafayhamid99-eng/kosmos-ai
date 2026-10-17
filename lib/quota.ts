'use client';

// Daily Free Quota Limit Rule (24-Hour Rolling Window)
// Every logged-in user gets strictly 3 Free Clips every 24 hours.
// Each free clip is capped at a maximum of 10 seconds of processing.

// Flag to temporarily hide and disable the daily 3-free-renders restriction
// Can be set to false at any time to immediately restore the 3-per-day limit.
export const TEMPORARILY_HIDE_DAILY_LIMIT = true;

// Flag to temporarily hide the 10-second video generation restriction for free accounts
// Can be set to false at any time to restore the 10-second restriction in the UI.
export const TEMPORARILY_HIDE_DURATION_LIMIT = true;

export const DAILY_FREE_CLIPS_LIMIT = 3;
export const MAX_CLIP_DURATION_SECONDS = 10;
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms

/**
 * Checks if the current runtime environment is local development or running on localhost.
 * In development, daily quota limits are bypassed to enable unlimited testing.
 */
export function isDevelopmentMode(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.includes('localhost')
    ) {
      return true;
    }
  }
  return false;
}

export interface DailyQuotaInfo {
  freeClipsUsedToday: number;
  lastResetTimestamp: number;
  clipsRemaining: number;
  resetsInFormatted: string;
  isExhausted: boolean;
  maxLimit: number;
  maxSecondsPerClip: number;
  isDevMode?: boolean;
}

export function formatTimeRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '0h 0m';
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export function getDailyQuota(userId?: string | null, clerkMetadata?: any): DailyQuotaInfo {
  const now = Date.now();

  // In development / localhost, disable the 3-clip daily limit for unlimited testing
  if (isDevelopmentMode()) {
    return {
      freeClipsUsedToday: 0,
      lastResetTimestamp: now,
      clipsRemaining: 9999,
      resetsInFormatted: 'Unlimited (Local Dev)',
      isExhausted: false,
      maxLimit: 9999,
      maxSecondsPerClip: MAX_CLIP_DURATION_SECONDS,
      isDevMode: true,
    };
  }

  if (!userId) {
    if (TEMPORARILY_HIDE_DAILY_LIMIT) {
      return {
        freeClipsUsedToday: 0,
        lastResetTimestamp: now,
        clipsRemaining: 9999,
        resetsInFormatted: 'Unlimited',
        isExhausted: false,
        maxLimit: 9999,
        maxSecondsPerClip: MAX_CLIP_DURATION_SECONDS,
        isDevMode: false,
      };
    }
    return {
      freeClipsUsedToday: 0,
      lastResetTimestamp: now,
      clipsRemaining: DAILY_FREE_CLIPS_LIMIT,
      resetsInFormatted: '24h 0m',
      isExhausted: false,
      maxLimit: DAILY_FREE_CLIPS_LIMIT,
      maxSecondsPerClip: MAX_CLIP_DURATION_SECONDS,
      isDevMode: false,
    };
  }

  const storageKey = `kosmos_daily_quota_${userId}`;
  let usedToday = 0;
  let resetTimestamp = now;

  // 1. Try reading from Clerk user metadata if available
  if (clerkMetadata && typeof clerkMetadata === 'object') {
    if (typeof clerkMetadata.freeClipsUsedToday === 'number') {
      usedToday = clerkMetadata.freeClipsUsedToday;
    }
    if (typeof clerkMetadata.lastResetTimestamp === 'number') {
      resetTimestamp = clerkMetadata.lastResetTimestamp;
    }
  }

  // 2. Try reading from localStorage (or fallback)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.freeClipsUsedToday === 'number') {
          // If local has newer usage, use max
          usedToday = Math.max(usedToday, parsed.freeClipsUsedToday);
        }
        if (typeof parsed.lastResetTimestamp === 'number') {
          resetTimestamp = parsed.lastResetTimestamp;
        }
      }
    } catch (e) {
      console.warn('Failed reading daily quota from storage:', e);
    }
  }

  // 3. Auto-reset rule: If 24 hours have passed since lastResetTimestamp, auto-reset to 0 / 3 remaining
  const elapsed = now - resetTimestamp;
  if (elapsed >= TWENTY_FOUR_HOURS_MS) {
    usedToday = 0;
    resetTimestamp = now;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ freeClipsUsedToday: 0, lastResetTimestamp: now })
        );
        window.dispatchEvent(new Event('kosmos_quota_changed'));
      } catch (e) {}
    }
  }

  // When daily limit is temporarily hidden/bypassed, preserve usage tracking while reporting unconstrained quota
  if (TEMPORARILY_HIDE_DAILY_LIMIT) {
    return {
      freeClipsUsedToday: usedToday,
      lastResetTimestamp: resetTimestamp,
      clipsRemaining: 9999,
      resetsInFormatted: 'Unlimited',
      isExhausted: false,
      maxLimit: 9999,
      maxSecondsPerClip: MAX_CLIP_DURATION_SECONDS,
      isDevMode: false,
    };
  }

  const remainingMs = Math.max(0, resetTimestamp + TWENTY_FOUR_HOURS_MS - now);
  const clipsRemaining = Math.max(0, DAILY_FREE_CLIPS_LIMIT - usedToday);
  const isExhausted = clipsRemaining <= 0;

  return {
    freeClipsUsedToday: usedToday,
    lastResetTimestamp: resetTimestamp,
    clipsRemaining,
    resetsInFormatted: formatTimeRemaining(remainingMs),
    isExhausted,
    maxLimit: DAILY_FREE_CLIPS_LIMIT,
    maxSecondsPerClip: MAX_CLIP_DURATION_SECONDS,
  };
}

export function consumeFreeClip(userId: string | null | undefined, clerkUser?: any): DailyQuotaInfo {
  if (isDevelopmentMode()) {
    return {
      freeClipsUsedToday: 0,
      lastResetTimestamp: Date.now(),
      clipsRemaining: 9999,
      resetsInFormatted: 'Unlimited (Local Dev)',
      isExhausted: false,
      maxLimit: 9999,
      maxSecondsPerClip: MAX_CLIP_DURATION_SECONDS,
      isDevMode: true,
    };
  }

  const effectiveUserId = userId || clerkUser?.id || 'guest_user';
  const current = getDailyQuota(effectiveUserId, clerkUser?.unsafeMetadata);
  const updatedUsed = Math.min(DAILY_FREE_CLIPS_LIMIT, current.freeClipsUsedToday + 1);
  const now = current.lastResetTimestamp || Date.now();
  const storageKey = `kosmos_daily_quota_${effectiveUserId}`;

  // Persist locally
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          freeClipsUsedToday: updatedUsed,
          lastResetTimestamp: now,
        })
      );
      // Also update general key for instant UI responsiveness
      localStorage.setItem('kosmos_daily_quota_active', JSON.stringify({
        freeClipsUsedToday: updatedUsed,
        lastResetTimestamp: now,
      }));
      window.dispatchEvent(new Event('kosmos_quota_changed'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Failed saving quota locally:', e);
    }
  }

  // Sync with Clerk user metadata if available
  if (clerkUser && typeof clerkUser.update === 'function') {
    clerkUser
      .update({
        unsafeMetadata: {
          ...(clerkUser.unsafeMetadata || {}),
          freeClipsUsedToday: updatedUsed,
          lastResetTimestamp: now,
        },
      })
      .catch((err: any) => {
        console.warn('[Clerk] Metadata quota sync error:', err?.message || err);
      });
  }

  return getDailyQuota(effectiveUserId);
}

// Explicit decrementQuota export as required by the specification
export const decrementQuota = consumeFreeClip;

