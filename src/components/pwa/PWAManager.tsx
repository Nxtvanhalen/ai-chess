'use client';

import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import PWAInstallButton from './PWAInstallButton';
import PWAInstallBanner from './PWAInstallBanner';
import PWAWelcome from './PWAWelcome';

interface PWAManagerProps {
  showFloatingButton?: boolean;
  showInstallBanner?: boolean;
  showWelcomeMessage?: boolean;
  floatingButtonPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  bannerPosition?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

/**
 * PWA Manager Component
 *
 * Orchestrates the entire PWA installation experience:
 * - Manages component visibility based on installation state
 * - Coordinates between install button, banner, and welcome message
 * - Provides centralized PWA feature management
 * - Ensures components don't conflict with chess gameplay
 * - Handles responsive behavior across devices
 */
export default function PWAManager({
  showFloatingButton = true,
  showInstallBanner = true,
  showWelcomeMessage = true,
  floatingButtonPosition = 'bottom-right',
  bannerPosition = 'bottom',
  className = '',
}: PWAManagerProps) {
  const [mounted, setMounted] = useState(false);

  const {
    isInstallable,
    isInstalled,
    isStandalone,
    canShowBanner,
    platform,
  } = usePWAInstall();

  // Only render after client-side hydration to prevent mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging for development (in useEffect to avoid hydration issues)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PWA Manager] Current state:', {
        isInstallable,
        isInstalled,
        isStandalone,
        canShowBanner,
        platform,
      });
    }
  }, [isInstallable, isInstalled, isStandalone, canShowBanner, platform]);

  // Don't render anything until after hydration
  if (!mounted) {
    return null;
  }

  return (
    <div className={`pwa-manager ${className}`}>
      {/* Floating Install Button - Shows when installable but not intrusive */}
      {showFloatingButton && (isInstallable || platform === 'ios') && !isStandalone && (
        <PWAInstallButton
          variant="floating"
          size="md"
          position={floatingButtonPosition}
          showIcon={true}
          showText={false}
          onInstallStart={() => {
            console.log('[PWA Manager] Floating button install started');
          }}
          onInstallComplete={(success) => {
            console.log('[PWA Manager] Floating button install completed:', success);
          }}
        />
      )}

      {/* Install Banner - Subtle notification about installation capability */}
      {showInstallBanner && canShowBanner && !isStandalone && (
        <PWAInstallBanner
          variant="toast"
          position={bannerPosition}
          autoShowDelay={5000}
          autoHideAfter={15000}
          showCloseButton={true}
        />
      )}

      {/* Welcome Message - Celebrates successful installation */}
      {showWelcomeMessage && isStandalone && (
        <PWAWelcome
          showOnFirstInstall={true}
          autoHideAfter={10000}
        />
      )}

    </div>
  );
}

