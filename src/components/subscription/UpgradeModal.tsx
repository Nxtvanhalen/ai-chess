'use client';

import { useEffect, useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ai_move' | 'chat';
  currentPlan?: string;
}

export default function UpgradeModal({ isOpen, onClose, type, currentPlan = 'free' }: UpgradeModalProps) {
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setBuying(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isPro = currentPlan === 'pro';
  const isPremium = currentPlan === 'premium';

  const title =
    type === 'ai_move'
      ? "You're out of moves"
      : "You're out of chat messages";

  const description =
    type === 'ai_move'
      ? "Grab more moves to keep playing, or upgrade your plan for a bigger monthly bank."
      : "Grab more messages to keep chatting with Chester, or upgrade your plan.";

  async function handleBuyMoves() {
    setBuying(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'movePack' }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[UpgradeModal] Checkout error:', data);
        setError(data.error || 'Failed to start checkout');
        setBuying(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[UpgradeModal] Network error:', err);
      setError('Something went wrong. Please try again.');
      setBuying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-white text-center mb-3">{title}</h2>
        <p className="text-gray-400 text-center mb-2">{description}</p>

        {/* Current plan indicator */}
        {(isPro || isPremium) && (
          <p className="text-sm text-purple-400 text-center mb-6">
            You&apos;re on the <span className="font-semibold">{isPro ? 'Pro' : 'Premium'}</span> plan
          </p>
        )}
        {!isPro && !isPremium && <div className="mb-6" />}

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-400 text-center mb-4 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Primary CTA: Buy 50 moves for $1 */}
        <button
          onClick={handleBuyMoves}
          disabled={buying}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl text-center transition-all text-lg shadow-lg shadow-emerald-900/30 mb-3"
        >
          {buying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            'Get 50 Moves — $1'
          )}
        </button>

        {/* Secondary CTA: Upgrade plan (only show if not premium) */}
        {!isPremium && (
          <a
            href="/pricing"
            className="block w-full py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-xl text-center transition-colors mb-3"
          >
            {isPro ? 'Upgrade to Premium' : 'Upgrade Plan'}
          </a>
        )}

        {/* Tertiary: Close */}
        <button
          onClick={onClose}
          className="w-full py-2 text-gray-500 hover:text-gray-400 text-sm transition-colors"
        >
          Maybe Later
        </button>

        {/* Mini plan comparison for free users */}
        {!isPro && !isPremium && (
          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">Pro</p>
                <p className="text-sm text-white font-medium">500 moves/mo</p>
                <p className="text-xs text-gray-500">$9.99/mo</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Premium</p>
                <p className="text-sm text-white font-medium">Unlimited</p>
                <p className="text-xs text-gray-500">$19.99/mo</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
