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
const CACHE_DURATION = 60000; // 60 seconds cache

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
      const response = await fetch('/api/subscription/usage');
      if (response.ok) {
        const data = await response.json();
        cachedUsage = data;
        lastFetchTime = now;
        setUsage(data);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Initial fetch (uses cache if available)
    fetchUsage();

    // Refresh every 2 minutes (reduced from 30 seconds)
    const interval = setInterval(() => fetchUsage(true), 120000);

    // Also refresh when window regains focus (user returns to tab)
    const handleFocus = () => fetchUsage();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchUsage]);

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
