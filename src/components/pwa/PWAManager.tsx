'use client';

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
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    canShowBanner,
    platform,
  } = usePWAInstall();

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[PWA Manager] Current state:', {
      isInstallable,
      isInstalled,
      isStandalone,
      canShowBanner,
      platform,
    });
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

      {/* Development Tools - Only in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <PWADebugPanel />
      )}
    </div>
  );
}

/**
 * Development Debug Panel
 * Helps developers test PWA installation flows
 */
function PWADebugPanel() {
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    platform,
    canShowBanner,
    showInstallBanner,
    permanentlyDismissed,
    resetPreferences,
  } = usePWAInstall();

  return (
    <div className="fixed top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="font-bold text-yellow-400 mb-2">PWA Debug Panel</div>
      <div className="space-y-1">
        <div>Platform: <span className="text-cyan-400">{platform}</span></div>
        <div>Installable: <span className={isInstallable ? 'text-green-400' : 'text-red-400'}>{String(isInstallable)}</span></div>
        <div>Installed: <span className={isInstalled ? 'text-green-400' : 'text-red-400'}>{String(isInstalled)}</span></div>
        <div>Standalone: <span className={isStandalone ? 'text-green-400' : 'text-red-400'}>{String(isStandalone)}</span></div>
        <div>Can Show Banner: <span className={canShowBanner ? 'text-green-400' : 'text-red-400'}>{String(canShowBanner)}</span></div>
        <div>Show Banner: <span className={showInstallBanner ? 'text-green-400' : 'text-red-400'}>{String(showInstallBanner)}</span></div>
        <div>Permanently Dismissed: <span className={permanentlyDismissed ? 'text-red-400' : 'text-green-400'}>{String(permanentlyDismissed)}</span></div>
      </div>
      <button
        onClick={resetPreferences}
        className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
      >
        Reset Preferences
      </button>
    </div>
  );
}