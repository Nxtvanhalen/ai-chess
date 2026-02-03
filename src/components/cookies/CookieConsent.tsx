'use client';

import { useEffect, useState } from 'react';

type ConsentStatus = 'pending' | 'accepted' | 'rejected';

const CONSENT_KEY = 'cookie-consent';

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus>('pending');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      setConsent(stored);
    }
    setIsLoaded(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setConsent('accepted');
  };

  const rejectCookies = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setConsent('rejected');
  };

  return { consent, isLoaded, acceptCookies, rejectCookies };
}

export default function CookieConsent() {
  const { consent, isLoaded, acceptCookies, rejectCookies } = useCookieConsent();

  // Don't render until we've checked localStorage
  if (!isLoaded || consent !== 'pending') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900/95 border-t border-gray-700 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-300 text-center sm:text-left">
          We use cookies to analyze site usage and improve your experience.{' '}
          <a href="/legal/privacy" className="text-purple-400 hover:text-purple-300 underline">
            Learn more
          </a>
        </p>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={rejectCookies}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={acceptCookies}
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
