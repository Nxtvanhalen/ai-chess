'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import PWAInstallButton from './PWAInstallButton';

interface PWAInstallBannerProps {
  variant?: 'banner' | 'toast' | 'card';
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoShowDelay?: number;
  autoHideAfter?: number;
  showCloseButton?: boolean;
  className?: string;
}

/**
 * PWA Install Banner Component
 * 
 * Subtle, elegant notification that:
 * - Shows when app is installable and user hasn't dismissed
 * - Provides platform-specific installation guidance
 * - Includes "Don't show again" option
 * - Responsive design that adapts to layout
 * - Progressive disclosure of installation instructions
 * - Chester-themed styling with smooth animations
 */
export default function PWAInstallBanner({
  variant = 'toast',
  position = 'bottom',
  autoShowDelay = 3000,
  autoHideAfter,
  showCloseButton = true,
  className = '',
}: PWAInstallBannerProps) {
  const {
    showInstallBanner,
    canShowBanner,
    platform,
    isInstalled,
    permanentlyDismissed,
    dismissBanner,
    permanentlyDismiss,
    promptInstall,
  } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-show logic
  useEffect(() => {
    if (showInstallBanner && canShowBanner && !isInstalled && !permanentlyDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        console.log('[PWA Install Banner] Banner shown');
      }, autoShowDelay);

      return () => clearTimeout(timer);
    }
  }, [showInstallBanner, canShowBanner, isInstalled, permanentlyDismissed, autoShowDelay]);

  // Auto-hide logic
  useEffect(() => {
    if (isVisible && autoHideAfter) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideAfter);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideAfter]);

  // Handle banner dismissal with animation
  const handleDismiss = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
      dismissBanner();
      console.log('[PWA Install Banner] Banner dismissed');
    }, 300);
  }, [dismissBanner]);

  // Handle permanent dismissal
  const handlePermanentDismiss = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
      permanentlyDismiss();
      console.log('[PWA Install Banner] Banner permanently dismissed');
    }, 300);
  }, [permanentlyDismiss]);

  // Handle install button click
  const handleInstallClick = useCallback(async () => {
    if (platform === 'ios') {
      setShowInstructions(true);
      return;
    }

    try {
      const success = await promptInstall();
      if (success) {
        handleDismiss();
      }
    } catch (error) {
      console.error('[PWA Install Banner] Install error:', error);
    }
  }, [platform, promptInstall, handleDismiss]);

  // Don't render if conditions aren't met
  if (!isVisible || isInstalled || permanentlyDismissed || !canShowBanner) {
    return null;
  }

  // Get banner styles based on variant and position
  const getBannerStyles = () => {
    const baseStyles = 'fixed z-50 max-w-sm mx-auto backdrop-blur-md transition-all duration-300 ease-out';
    
    const variantStyles = {
      banner: 'left-4 right-4 bg-gradient-to-r from-purple-900/95 to-indigo-900/95 border border-purple-500/30 rounded-xl shadow-2xl',
      toast: 'bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl backdrop-blur-xl',
      card: 'bg-gradient-to-br from-blue-900/95 to-purple-900/95 border border-blue-500/30 rounded-2xl shadow-3xl',
    };

    const positionStyles = {
      top: 'top-4 left-4 right-4',
      bottom: 'bottom-4 left-4 right-4',
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4',
    };

    const animationStyles = isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100';

    return `${baseStyles} ${variantStyles[variant]} ${positionStyles[position]} ${animationStyles} ${className}`;
  };

  // iOS installation instructions
  const IOSInstructions = () => (
    <div className="mt-3 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
      <h4 className="text-sm font-semibold text-blue-200 mb-2">How to install on iOS:</h4>
      <div className="space-y-2 text-xs text-blue-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
          <span>Tap the Share button <span className="text-blue-300">⎋</span> in Safari</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
          <span>Scroll and tap "Add to Home Screen"</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
          <span>Tap "Add" to install Chester</span>
        </div>
      </div>
    </div>
  );

  // Chess piece icon for Chester theming
  const ChessIcon = () => (
    <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 22H5v-2h14v2zM17.16 8.26A2.988 2.988 0 0015 7c-.93 0-1.77.43-2.33 1.11-.07.09-.07.21.01.29.07.07.18.07.25-.01A2.015 2.015 0 0115 7.5c.83 0 1.5.67 1.5 1.5 0 .19-.03.37-.09.54-.04.1.01.21.11.25.1.04.21-.01.25-.11.08-.22.13-.45.13-.68 0-.93-.43-1.77-1.11-2.33-.09-.07-.21-.07-.29.01-.07.07-.07.18.01.25.68.56 1.11 1.4 1.11 2.33 0 .23-.05.46-.13.68-.04.1.01.21.11.25.1.04.21-.01.25-.11.06-.17.09-.35.09-.54 0-.83-.67-1.5-1.5-1.5a2.015 2.015 0 00-2.07.89c-.08.08-.08.2-.01.29.08.07.19.07.26-.01.56-.68 1.4-1.11 2.33-1.11.93 0 1.77.43 2.33 1.11.07.09.18.08.25.01.08-.08.08-.2-.01-.29A2.988 2.988 0 0019 7c-.93 0-1.77.43-2.33 1.11-.09.07-.21.07-.29-.01-.07-.07-.07-.18.01-.25A2.988 2.988 0 0119 7c.93 0 1.77.43 2.33 1.11.07.09.18.08.25.01.08-.08.08-.2-.01-.29z" />
      <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 1c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-6 17h12l-1-9H7l-1 9z" />
    </svg>
  );

  return (
    <div className={getBannerStyles()}>
      {/* Close button */}
      {showCloseButton && (
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
          aria-label="Dismiss install banner"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 mt-0.5">
            <ChessIcon />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">
              Install Chester AI Chess
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Get the full chess experience! Install Chester for offline play, faster loading, and a native app feel.
            </p>
          </div>
        </div>

        {/* iOS Instructions (if shown) */}
        {showInstructions && platform === 'ios' && <IOSInstructions />}

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="flex gap-2">
            <PWAInstallButton
              variant="primary"
              size="sm"
              showIcon={true}
              showText={true}
              onInstallStart={() => console.log('[PWA Install Banner] Install started')}
              onInstallComplete={(success) => {
                if (success) {
                  handleDismiss();
                }
                console.log('[PWA Install Banner] Install completed:', success);
              }}
            />
            
            {platform === 'ios' && !showInstructions && (
              <button
                onClick={() => setShowInstructions(true)}
                className="px-3 py-1.5 text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors duration-200"
              >
                Show how
              </button>
            )}
          </div>

          <button
            onClick={handlePermanentDismiss}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors duration-200 whitespace-nowrap"
          >
            Don't show again
          </button>
        </div>

        {/* Benefits showcase */}
        <div className="mt-4 pt-3 border-t border-gray-600/30">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Offline play</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Faster loading</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Home screen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Native feel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}