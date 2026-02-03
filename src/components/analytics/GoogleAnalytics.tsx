'use client';

import { useEffect, useState } from 'react';

const GA_MEASUREMENT_ID = 'G-G1ZX8EGV0N';
const CONSENT_KEY = 'cookie-consent';

export default function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);
  const [gaLoaded, setGaLoaded] = useState(false);

  // Check for consent
  useEffect(() => {
    const checkConsent = () => {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (consent === 'accepted') {
        setHasConsent(true);
      }
    };

    checkConsent();

    // Listen for consent changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY && e.newValue === 'accepted') {
        setHasConsent(true);
      }
    };

    window.addEventListener('storage', handleStorage);

    // Check periodically for same-tab changes
    const interval = setInterval(checkConsent, 500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Load GA when consent is given
  useEffect(() => {
    if (!hasConsent || gaLoaded) return;

    // Create and inject the gtag.js script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);

    // Make gtag globally available
    (window as any).gtag = gtag;

    setGaLoaded(true);
    console.log('[GA] Google Analytics loaded with ID:', GA_MEASUREMENT_ID);
  }, [hasConsent, gaLoaded]);

  return null;
}

// Type declaration for window
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Export measurement ID for use in other components if needed
export { GA_MEASUREMENT_ID };
