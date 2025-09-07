"use client";

import { useState, useEffect } from 'react';

/**
 * Feature detection hook for interactive-widget viewport support
 * 
 * Browser Support (2024):
 * ✅ Chrome 108+ (Nov 2022)
 * ✅ Firefox 132+ (2024)  
 * ❌ Safari/iOS (not yet supported)
 * 
 * @returns boolean indicating if interactive-widget is supported
 */
export function useInteractiveWidgetSupport(): boolean {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Feature detection for interactive-widget support
    const detectSupport = () => {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') return false;

      // Method 1: Check viewport meta tag support
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'interactive-widget=resizes-visual';
      
      // Method 2: User agent detection as fallback
      const userAgent = navigator.userAgent;
      const isChrome = /Chrome\/(\d+)/.test(userAgent);
      const isFirefox = /Firefox\/(\d+)/.test(userAgent);
      
      if (isChrome) {
        const chromeVersion = parseInt(userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');
        return chromeVersion >= 108;
      }
      
      if (isFirefox) {
        const firefoxVersion = parseInt(userAgent.match(/Firefox\/(\d+)/)?.[1] || '0');
        return firefoxVersion >= 132;
      }
      
      // Safari and other browsers don't support it yet
      return false;
    };

    setIsSupported(detectSupport());
  }, []);

  return isSupported;
}

/**
 * Browser information hook for debugging
 */
export function useBrowserInfo() {
  const [browserInfo, setBrowserInfo] = useState<{
    name: string;
    version: number;
    supportsInteractiveWidget: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 0;

    if (/Chrome\/(\d+)/.test(userAgent)) {
      name = 'Chrome';
      version = parseInt(userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');
    } else if (/Firefox\/(\d+)/.test(userAgent)) {
      name = 'Firefox';
      version = parseInt(userAgent.match(/Firefox\/(\d+)/)?.[1] || '0');
    } else if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) {
      name = 'Safari';
      // Safari version detection is more complex, simplified here
      version = parseInt(userAgent.match(/Version\/(\d+)/)?.[1] || '0');
    }

    const supportsInteractiveWidget = 
      (name === 'Chrome' && version >= 108) ||
      (name === 'Firefox' && version >= 132);

    setBrowserInfo({
      name,
      version,
      supportsInteractiveWidget
    });
  }, []);

  return browserInfo;
}