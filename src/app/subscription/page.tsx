'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { redirectToCustomerPortal } from '@/lib/stripe/client';

function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleManage = async () => {
    setLoading(true);
    setError('');
    try {
      await redirectToCustomerPortal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open portal';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleManage}
        disabled={loading}
        className="block w-full px-8 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
      >
        {loading ? 'Opening Portal...' : 'Manage Subscription'}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-500/30 rounded-2xl p-12 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-green-500"
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
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Subscription Activated!</h1>
          <p className="text-gray-400 mb-8">
            Welcome to the Chester AI Chess family! Your subscription is now active and you have
            access to all your plan's features.
          </p>
          <div className="space-y-3">
            <a
              href="/play"
              className="block px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
            >
              Start Playing
            </a>
            <ManageSubscriptionButton />
          </div>
        </div>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 max-w-md text-center">
          <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Checkout Canceled</h1>
          <p className="text-gray-400 mb-8">
            No worries! You can upgrade anytime when you're ready.
          </p>
          <div className="space-y-3">
            <a
              href="/pricing"
              className="block px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
            >
              View Plans
            </a>
            <a
              href="/play"
              className="block px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
            >
              Back to Game
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Default subscription management page
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Subscription</h1>
        <p className="text-gray-400 mb-8">Manage your Chester AI Chess subscription.</p>
        <div className="space-y-3">
          <ManageSubscriptionButton />
          <a
            href="/pricing"
            className="block px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors text-center"
          >
            View Plans
          </a>
          <a
            href="/play"
            className="block px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors text-center"
          >
            Back to Game
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
