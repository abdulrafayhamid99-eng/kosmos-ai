'use client';

import { useCallback, useEffect, useState } from 'react';

export function useStudioBalance(userId?: string | null) {
  const [balance, setBalance] = useState<{ userId: string; credits: number } | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return;
    try {
      const response = await fetch('/api/balance', { cache: 'no-store', signal });
      const data = response.ok ? await response.json() : null;
      if (!signal?.aborted && typeof data?.credits === 'number') setBalance({ userId, credits: data.credits });
    } catch {
      // The UI keeps the last confirmed balance while the service is unavailable.
    }
  }, [userId]);

  useEffect(() => {
    const request = new AbortController();
    void refresh(request.signal);
    return () => request.abort();
  }, [refresh]);

  return { credits: balance?.userId === userId ? balance?.credits ?? null : null, refresh };
}
