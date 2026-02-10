'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium',
};

// Cache usage data to avoid excessive API calls
let cachedUsage: UsageData | null = null;
let lastFetchTime = 0;
let inFlightUsageRequest: Promise<UsageData | null> | null = null;
const CACHE_DURATION = 60000; // 60 seconds cache
const FOCUS_REFRESH_COOLDOWN = 30000; // 30 seconds

export default function UsageDisplay() {
  const { user, signOut } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(cachedUsage);
  const [loading, setLoading] = useState(!cachedUsage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  if (!user || loading) return null;
  if (!usage) return null;

  const movesPercentage = usage.ai_moves.unlimited
    ? 100
    : Math.round((usage.ai_moves.remaining / usage.ai_moves.limit) * 100);

  const isLow = !usage.ai_moves.unlimited && usage.ai_moves.remaining <= 10;
  const isEmpty = !usage.ai_moves.unlimited && usage.ai_moves.remaining === 0;
  const planLabel = PLAN_LABELS[usage.plan] || usage.plan;
  const isPaid = usage.plan === 'pro' || usage.plan === 'premium';

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setMenuOpen(false);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('[UsageDisplay] Portal error:', data.error || response.status);
        setPortalLoading(false);
        return;
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        console.warn('[UsageDisplay] No portal URL returned');
        setPortalLoading(false);
      }
    } catch (err) {
      console.warn('[UsageDisplay] Portal network error:', err);
      setPortalLoading(false);
    }
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

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

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors border border-gray-600"
          title="Account menu"
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 bottom-full mb-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-[200]">
            {/* Plan info */}
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <p className="text-sm text-white mt-1">
                <span className={`font-medium ${isPaid ? 'text-purple-400' : 'text-gray-300'}`}>
                  {planLabel}
                </span>
                <span className="text-gray-500"> plan</span>
              </p>
            </div>

            {/* Actions */}
            <div className="py-1">
              {isPaid && (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                >
                  {portalLoading ? 'Opening...' : 'Manage Subscription'}
                </button>
              )}
              <a
                href="/pricing"
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {isPaid ? 'Change Plan' : 'View Plans'}
              </a>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors border-t border-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
