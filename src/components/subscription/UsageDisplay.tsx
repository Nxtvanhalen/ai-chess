'use client';

import { useEffect, useRef, useState } from 'react';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
import { setGlobalAvatarUrl } from '@/hooks/useAvatarUrl';

interface UsageData {
  ai_moves: {
    balance: number;
    unlimited: boolean;
  };
  chat_messages: {
    balance: number;
    unlimited: boolean;
  };
  plan: string;
  rating?: number;
  avatar_url?: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium',
};

/** Color-code rating by skill band */
function getRatingColor(rating: number): string {
  if (rating >= 1800) return 'text-purple-400';
  if (rating >= 1400) return 'text-blue-400';
  if (rating >= 1000) return 'text-green-400';
  return 'text-gray-400';
}

// Custom event name for cross-component cache invalidation
const USAGE_INVALIDATE_EVENT = 'chester:usage-invalidate';

/**
 * Bust the usage cache from outside the component (e.g. after a purchase or move).
 * Dispatches a DOM event that UsageDisplay listens for.
 */
export function invalidateUsageCache() {
  window.dispatchEvent(new Event(USAGE_INVALIDATE_EVENT));
}

export default function UsageDisplay() {
  const { user, signOut } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Single fetch function - no caching games, just fetch from server
  useEffect(() => {
    if (!user?.id) {
      console.log('[UsageDisplay] No user, skipping fetch');
      return;
    }

    console.log('[UsageDisplay] Effect running for user:', user.id);
    let cancelled = false;

    const fetchUsage = async () => {
      try {
        console.log('[UsageDisplay] Fetching usage data...');
        const response = await fetch('/api/subscription/usage');
        console.log('[UsageDisplay] Response status:', response.status);
        if (!response.ok) {
          const text = await response.text();
          console.warn(`[UsageDisplay] Fetch failed: ${response.status}`, text);
          return;
        }
        const data = (await response.json()) as UsageData;
        console.log('[UsageDisplay] Got data:', JSON.stringify(data));
        if (!cancelled) {
          console.log('[UsageDisplay] Setting usage state');
          setUsage(data);
        } else {
          console.log('[UsageDisplay] Cancelled, skipping state update');
        }
      } catch (error) {
        console.error('[UsageDisplay] Error fetching usage:', error);
      }
    };

    // Initial fetch
    fetchUsage();

    // Listen for invalidation events (from AI move, purchase, etc.)
    const handleInvalidate = () => {
      console.log('[UsageDisplay] Invalidated, re-fetching');
      fetchUsage();
    };
    window.addEventListener(USAGE_INVALIDATE_EVENT, handleInvalidate);

    // Refresh every 60 seconds while visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUsage();
      }
    }, 60000);

    // Refresh on tab focus
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchUsage();
      }
    };
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener(USAGE_INVALIDATE_EVENT, handleInvalidate);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.id]);

  // Sync avatar URL from usage data → local state + global store
  useEffect(() => {
    if (usage?.avatar_url) {
      setAvatarUrl(usage.avatar_url);
      setGlobalAvatarUrl(usage.avatar_url);
    }
  }, [usage?.avatar_url]);

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

  // Don't render anything if not logged in
  if (!user) return null;

  // Show skeleton while loading
  if (!usage) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-1 rounded-lg text-sm relative z-[100]"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Moves:</span>
          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden animate-pulse" />
          <span className="text-gray-500 font-medium">--</span>
        </div>
        {/* User menu button (always visible) */}
        <div className="relative">
          <button
            className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600 opacity-50"
            disabled
          >
            <svg
              className="w-4 h-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Plan allocation for progress bar reference (how many moves you get per month)
  const planAllocation = usage.plan === 'premium' ? -1 : usage.plan === 'pro' ? 500 : 50;
  const movesPercentage = usage.ai_moves.unlimited
    ? 100
    : planAllocation > 0
      ? Math.min(100, Math.round((usage.ai_moves.balance / planAllocation) * 100))
      : 0;

  const isLow = !usage.ai_moves.unlimited && usage.ai_moves.balance <= 10;
  const isEmpty = !usage.ai_moves.unlimited && usage.ai_moves.balance === 0;
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
    <div
      className="flex items-center gap-3 px-3 py-1 rounded-lg text-sm relative z-[100]"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Moves:</span>
        {usage.ai_moves.unlimited ? (
          <span className="text-green-400 font-medium">&infin;</span>
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
              {usage.ai_moves.balance}
            </span>
          </>
        )}
      </div>

      {usage.rating != null && (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Rating:</span>
          <span className={`font-medium ${getRatingColor(usage.rating)}`}>{usage.rating}</span>
        </div>
      )}

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
          className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors border border-gray-600 overflow-hidden"
          title="Account menu"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <svg
              className="w-4 h-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          )}
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
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setAvatarModalOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                Change Avatar
              </button>
              <a
                href="/pricing"
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {isPaid ? 'Change Plan' : 'View Plans'}
              </a>
              <a
                href="/"
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                Home
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

      <AvatarUpload
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onSaved={(url) => {
          setAvatarUrl(url);
          setGlobalAvatarUrl(url);
        }}
        currentAvatarUrl={avatarUrl}
      />
    </div>
  );
}
