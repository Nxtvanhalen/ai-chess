'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * PWA Installation Detection and Management Hook
 *
 * Provides comprehensive PWA installation capabilities including:
 * - BeforeInstallPrompt event detection
 * - Installation state management
 * - Platform-specific install flows
 * - Post-install detection
 * - User preference tracking
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface PWAInstallState {
  // Installation states
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  hasInstallPromptDismissed: boolean;

  // Platform detection
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  canShowBanner: boolean;

  // User preferences
  showInstallBanner: boolean;
  permanentlyDismissed: boolean;

  // Installation actions
  promptInstall: () => Promise<boolean>;
  dismissBanner: () => void;
  permanentlyDismiss: () => void;
  resetPreferences: () => void;
}

const STORAGE_KEYS = {
  INSTALL_DISMISSED: 'chester-pwa-install-dismissed',
  BANNER_DISMISSED: 'chester-pwa-banner-dismissed',
  PERMANENTLY_DISMISSED: 'chester-pwa-permanently-dismissed',
  INSTALL_INTERACTIONS: 'chester-pwa-install-interactions',
} as const;

export function usePWAInstall(): PWAInstallState {
  const [isInstallable, setIsInstallable] = useState(false);
  const [_isInstalled, setIsInstalled] = useState(false);
  const [hasInstallPromptDismissed, setHasInstallPromptDismissed] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(false);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Platform detection with verbose logging
  const platform = useRef<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');
  const isStandalone = useRef(false);

  useEffect(() => {
    try {
      // Detect standalone mode
      isStandalone.current =
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error - iOS specific property
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');

      // Platform detection
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);

      if (isIOS) {
        platform.current = 'ios';
      } else if (isAndroid) {
        platform.current = 'android';
      } else if (window.innerWidth > 1024) {
        platform.current = 'desktop';
      }

      console.log('[PWA Install] Platform detection:', {
        platform: platform.current,
        isStandalone: isStandalone.current,
        userAgent: navigator.userAgent,
        displayMode: window.matchMedia('(display-mode: standalone)').matches,
      });

      setIsInstalled(isStandalone.current);
    } catch (error) {
      console.error('[PWA Install] Platform detection error:', error);
    }
  }, []);

  // Load user preferences from localStorage
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEYS.PERMANENTLY_DISMISSED) === 'true';
      const bannerDismissed = localStorage.getItem(STORAGE_KEYS.BANNER_DISMISSED) === 'true';

      setPermanentlyDismissed(dismissed);
      setHasInstallPromptDismissed(bannerDismissed);

      console.log('[PWA Install] User preferences loaded:', {
        permanentlyDismissed: dismissed,
        bannerDismissed,
      });
    } catch (error) {
      console.error('[PWA Install] Failed to load preferences:', error);
    }
  }, []);

  // BeforeInstallPrompt event listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA Install] beforeinstallprompt fired');
      e.preventDefault();

      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = beforeInstallPromptEvent;
      setIsInstallable(true);

      // Show banner if not permanently dismissed and not installed
      if (!permanentlyDismissed && !isStandalone.current && !hasInstallPromptDismissed) {
        // Small delay to let the user see the app first
        setTimeout(() => {
          setShowInstallBanner(true);
          console.log('[PWA Install] Banner shown automatically');
        }, 3000);
      }
    };

    const handleAppInstalled = () => {
      console.log('[PWA Install] App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallBanner(false);
      deferredPromptRef.current = null;

      // Track successful installation
      try {
        const interactions = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.INSTALL_INTERACTIONS) || '[]',
        );
        interactions.push({
          type: 'installed',
          timestamp: Date.now(),
          platform: platform.current,
        });
        localStorage.setItem(STORAGE_KEYS.INSTALL_INTERACTIONS, JSON.stringify(interactions));
      } catch (error) {
        console.error('[PWA Install] Failed to track installation:', error);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [permanentlyDismissed, hasInstallPromptDismissed]);

  // Prompt installation function
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPromptRef.current) {
      console.warn('[PWA Install] No install prompt available');
      return false;
    }

    try {
      console.log('[PWA Install] Prompting user for installation');
      await deferredPromptRef.current.prompt();

      const choiceResult = await deferredPromptRef.current.userChoice;
      console.log('[PWA Install] User choice:', choiceResult);

      const installed = choiceResult.outcome === 'accepted';

      // Track user interaction
      try {
        const interactions = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.INSTALL_INTERACTIONS) || '[]',
        );
        interactions.push({
          type: installed ? 'accepted' : 'dismissed',
          timestamp: Date.now(),
          platform: platform.current,
        });
        localStorage.setItem(STORAGE_KEYS.INSTALL_INTERACTIONS, JSON.stringify(interactions));
      } catch (error) {
        console.error('[PWA Install] Failed to track interaction:', error);
      }

      if (installed) {
        setIsInstalled(true);
        setShowInstallBanner(false);
      } else {
        setHasInstallPromptDismissed(true);
        localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED, 'true');
      }

      deferredPromptRef.current = null;
      setIsInstallable(false);

      return installed;
    } catch (error) {
      console.error('[PWA Install] Installation prompt error:', error);
      return false;
    }
  }, []);

  // Banner dismissal
  const dismissBanner = useCallback(() => {
    console.log('[PWA Install] Banner dismissed temporarily');
    setShowInstallBanner(false);

    try {
      localStorage.setItem(STORAGE_KEYS.BANNER_DISMISSED, 'true');
    } catch (error) {
      console.error('[PWA Install] Failed to save banner dismissal:', error);
    }
  }, []);

  // Permanent dismissal
  const permanentlyDismiss = useCallback(() => {
    console.log('[PWA Install] Banner permanently dismissed');
    setShowInstallBanner(false);
    setPermanentlyDismissed(true);

    try {
      localStorage.setItem(STORAGE_KEYS.PERMANENTLY_DISMISSED, 'true');

      // Track permanent dismissal
      const interactions = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.INSTALL_INTERACTIONS) || '[]',
      );
      interactions.push({
        type: 'permanently_dismissed',
        timestamp: Date.now(),
        platform: platform.current,
      });
      localStorage.setItem(STORAGE_KEYS.INSTALL_INTERACTIONS, JSON.stringify(interactions));
    } catch (error) {
      console.error('[PWA Install] Failed to save permanent dismissal:', error);
    }
  }, []);

  // Reset preferences (for testing/debugging)
  const resetPreferences = useCallback(() => {
    console.log('[PWA Install] Resetting all preferences');

    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });

      setHasInstallPromptDismissed(false);
      setPermanentlyDismissed(false);
      setShowInstallBanner(false);
    } catch (error) {
      console.error('[PWA Install] Failed to reset preferences:', error);
    }
  }, []);

  // Determine if banner can be shown
  const canShowBanner =
    !isStandalone.current && !permanentlyDismissed && (isInstallable || platform.current === 'ios');

  return {
    // Installation states
    isInstallable,
    isInstalled: isStandalone.current,
    isStandalone: isStandalone.current,
    hasInstallPromptDismissed,

    // Platform info
    platform: platform.current,
    canShowBanner,

    // User preferences
    showInstallBanner,
    permanentlyDismissed,

    // Actions
    promptInstall,
    dismissBanner,
    permanentlyDismiss,
    resetPreferences,
  };
}
