'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_FEATURES, PRICING } from '@/lib/stripe/config';
import Link from 'next/link';

type BillingInterval = 'monthly' | 'yearly';

export default function PricingPage() {
  const { user } = useAuth();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  const fetchCurrentPlan = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/subscription/usage');
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.plan || 'free');
      }
    } catch (error) {
      console.error('[Pricing] Failed to fetch current plan:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchCurrentPlan();
  }, [fetchCurrentPlan]);

  const handleCheckout = async (plan: 'pro' | 'premium') => {
    if (!user) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    setLoading(plan);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned');
        alert('Error creating checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error creating checkout session. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-12 px-4 overflow-auto fixed inset-0">
      {/* Hamburger Menu */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:bg-gray-700/50 transition-colors"
          aria-label="Menu"
        >
          <svg
            className="w-6 h-6 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl overflow-hidden">
            <Link
              href="/"
              className="block px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Back to Game
            </Link>
            <div className="border-t border-gray-700" />
            <Link
              href="/legal/privacy"
              className="block px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/terms"
              className="block px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Terms of Service
            </Link>
            <div className="border-t border-gray-700" />
            <a
              href="mailto:Chrisleebergstrom@gmail.com"
              className="block px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Contact
            </a>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Unlock Chester's full potential with a Pro or Premium subscription
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-gray-800/50 rounded-full p-1 flex">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                interval === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                interval === 'yearly'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-400">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-2">{PLAN_FEATURES.free.name}</h3>
            <p className="text-gray-400 text-sm mb-6">{PLAN_FEATURES.free.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-gray-500">/forever</span>
            </div>
            <ul className="space-y-3 mb-8">
              {PLAN_FEATURES.free.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            {currentPlan === 'free' ? (
              <button
                disabled
                className="w-full py-3 rounded-xl bg-gray-700 text-gray-400 font-medium cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                disabled
                className="w-full py-3 rounded-xl bg-gray-700 text-gray-500 font-medium cursor-not-allowed"
              >
                Free Plan
              </button>
            )}
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-b from-purple-900/50 to-gray-800/50 backdrop-blur-sm border border-purple-500/50 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                POPULAR
              </span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{PLAN_FEATURES.pro.name}</h3>
            <p className="text-gray-400 text-sm mb-6">{PLAN_FEATURES.pro.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                {formatPrice(PRICING.pro[interval])}
              </span>
              <span className="text-gray-500">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {PLAN_FEATURES.pro.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                  <svg
                    className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            {currentPlan === 'pro' ? (
              <button
                disabled
                className="w-full py-3 rounded-xl bg-purple-600/50 text-purple-200 font-medium cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleCheckout('pro')}
                disabled={loading === 'pro'}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {loading === 'pro' ? 'Loading...' : 'Get Pro'}
              </button>
            )}
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-b from-amber-900/30 to-gray-800/50 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-2">{PLAN_FEATURES.premium.name}</h3>
            <p className="text-gray-400 text-sm mb-6">{PLAN_FEATURES.premium.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                {formatPrice(PRICING.premium[interval])}
              </span>
              <span className="text-gray-500">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {PLAN_FEATURES.premium.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                  <svg
                    className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            {currentPlan === 'premium' ? (
              <button
                disabled
                className="w-full py-3 rounded-xl bg-amber-600/50 text-amber-200 font-medium cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleCheckout('premium')}
                disabled={loading === 'premium'}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium transition-colors disabled:opacity-50"
              >
                {loading === 'premium' ? 'Loading...' : 'Get Premium'}
              </button>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-12 space-x-6">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            Back to Game
          </Link>
          <Link href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
            Privacy
          </Link>
          <Link href="/legal/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
