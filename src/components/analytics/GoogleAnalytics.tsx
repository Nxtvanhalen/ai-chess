'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const GA_MEASUREMENT_ID = 'G-G1ZX8EGV0N';
const CONSENT_KEY = 'cookie-consent';

export default function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check if user has accepted cookies
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted') {
      setHasConsent(true);
    }

    // Listen for consent changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY && e.newValue === 'accepted') {
        setHasConsent(true);
      }
    };

    window.addEventListener('storage', handleStorage);

    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const currentConsent = localStorage.getItem(CONSENT_KEY);
      if (currentConsent === 'accepted' && !hasConsent) {
        setHasConsent(true);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [hasConsent]);

  // Don't load GA until user consents
  if (!hasConsent) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}

// Export measurement ID for use in other components if needed
export { GA_MEASUREMENT_ID };
