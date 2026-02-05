'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UsageData {
  ai_moves: {
    used: number;
    limit: number;
    remaining: number;
    unlimited: boolean;
  };
  chat_messages: {
    used: number;
    limit: number;
    remaining: number;
    unlimited: boolean;
  };
  plan: string;
}

// Cache usage data to avoid excessive API calls
let cachedUsage: UsageData | null = null;
let lastFetchTime = 0;
let inFlightUsageRequest: Promise<UsageData | null> | null = null;
const CACHE_DURATION = 60000; // 60 seconds cache
const FOCUS_REFRESH_COOLDOWN = 30000; // 30 seconds

export default function UsageDisplay() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(cachedUsage);
  const [loading, setLoading] = useState(!cachedUsage);

  const fetchUsage = useCallback(async (force = false) => {
    // Skip if cached data is fresh (unless forced)
    const now = Date.now();
    if (!force && cachedUsage && now - lastFetchTime < CACHE_DURATION) {
      setUsage(cachedUsage);
      setLoading(false);
      return;
    }

    try {
      if (!inFlightUsageRequest) {
        inFlightUsageRequest = (async () => {
          const response = await fetch('/api/subscription/usage');
          if (!response.ok) return null;

          const data = (await response.json()) as UsageData;
          cachedUsage = data;
          lastFetchTime = Date.now();
          return data;
        })().finally(() => {
          inFlightUsageRequest = null;
        });
      }

      const data = await inFlightUsageRequest;
      if (data) {
        setUsage(data);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Initial fetch (uses cache if available)
    fetchUsage();

    // Refresh every 2 minutes (reduced from 30 seconds)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUsage(true);
      }
    }, 120000);

    // Refresh when tab regains focus/visibility, but throttle it.
    let lastFocusRefresh = 0;
    const refreshOnFocus = () => {
      const now = Date.now();
      if (document.visibilityState !== 'visible') return;
      if (now - lastFocusRefresh < FOCUS_REFRESH_COOLDOWN) return;
      lastFocusRefresh = now;
      fetchUsage();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshOnFocus();
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, fetchUsage]);

  if (!user || loading) return null;
  if (!usage) return null;

  const movesPercentage = usage.ai_moves.unlimited
    ? 100
    : Math.round((usage.ai_moves.remaining / usage.ai_moves.limit) * 100);

  const isLow = !usage.ai_moves.unlimited && usage.ai_moves.remaining <= 10;
  const isEmpty = !usage.ai_moves.unlimited && usage.ai_moves.remaining === 0;

  return (
    <div className="flex items-center gap-3 px-3 py-1 rounded-lg text-sm relative z-[100]" style={{ pointerEvents: 'auto' }}>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Moves:</span>
        {usage.ai_moves.unlimited ? (
          <span className="text-green-400 font-medium">Unlimited</span>
        ) : (
          <>
            <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isEmpty ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${movesPercentage}%` }}
              />
            </div>
            <span
              className={`font-medium ${
                isEmpty ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              {usage.ai_moves.remaining}/{usage.ai_moves.limit}
            </span>
          </>
        )}
      </div>

      {usage.plan !== 'premium' && (
        <a
          href="/pricing"
          className="text-purple-400 hover:text-purple-300 transition-colors text-xs relative z-[100] cursor-pointer"
          style={{ pointerEvents: 'auto' }}
        >
          Upgrade
        </a>
      )}
    </div>
  );
}
