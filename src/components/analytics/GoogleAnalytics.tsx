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

    // Initialize dataLayer first (before script loads)
    window.dataLayer = window.dataLayer || [];

    // Define gtag function exactly as Google specifies
    // Must use 'arguments' not spread operator for GA to work
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    // Send initial events
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);

    // Create and inject the gtag.js script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

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
