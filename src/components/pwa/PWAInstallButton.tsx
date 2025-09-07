'use client';

import { useState, useCallback } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'secondary' | 'minimal' | 'floating';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'static';
  onInstallStart?: () => void;
  onInstallComplete?: (success: boolean) => void;
}

/**
 * PWA Install Button Component
 * 
 * Elegant, responsive install button that:
 * - Only shows when app is installable
 * - Provides platform-specific install flows
 * - Chester-themed design with smooth animations
 * - Smart positioning that doesn't interfere with gameplay
 * - Comprehensive error handling and feedback
 */
export default function PWAInstallButton({
  variant = 'primary',
  size = 'md',
  className = '',
  showIcon = true,
  showText = true,
  position = 'static',
  onInstallStart,
  onInstallComplete,
}: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    platform,
    promptInstall,
  } = usePWAInstall();

  const [isInstalling, setIsInstalling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle install button click
  const handleInstall = useCallback(async () => {
    try {
      setIsInstalling(true);
      onInstallStart?.();

      console.log('[PWA Install Button] Starting installation process');

      // For iOS, we can't programmatically install, so show instructions
      if (platform === 'ios') {
        // This will be handled by the parent component or banner
        console.log('[PWA Install Button] iOS install requires manual steps');
        onInstallComplete?.(false);
        return;
      }

      // For other platforms, use the native install prompt
      const success = await promptInstall();
      
      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        console.log('[PWA Install Button] Installation successful');
      }
      
      onInstallComplete?.(success);
    } catch (error) {
      console.error('[PWA Install Button] Installation error:', error);
      onInstallComplete?.(false);
    } finally {
      setIsInstalling(false);
    }
  }, [platform, promptInstall, onInstallStart, onInstallComplete]);

  // Don't render if already installed or not installable (except iOS)
  if (isInstalled || (!isInstallable && platform !== 'ios')) {
    return null;
  }

  // Base button styles with Chester theming
  const getButtonStyles = () => {
    const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden';
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
      md: 'px-4 py-2 text-base rounded-lg gap-2',
      lg: 'px-6 py-3 text-lg rounded-xl gap-2.5',
    };

    const variantStyles = {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl focus:ring-blue-500 transform hover:scale-105',
      secondary: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl focus:ring-purple-500 transform hover:scale-105',
      minimal: 'bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:border-white/30 focus:ring-white/50',
      floating: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-2xl hover:shadow-3xl focus:ring-emerald-500 rounded-full transform hover:scale-110 hover:-translate-y-1',
    };

    const positionStyles: Record<string, string> = position !== 'static' ? {
      'top-left': 'fixed top-4 left-4 z-50',
      'top-right': 'fixed top-4 right-4 z-50',
      'bottom-left': 'fixed bottom-4 left-4 z-50',
      'bottom-right': 'fixed bottom-4 right-4 z-50',
    } : {};

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${positionStyles[position] || ''} ${className}`;
  };

  // Install icon component
  const InstallIcon = ({ className = "" }: { className?: string }) => (
    <svg 
      className={`${className} transition-transform duration-300 group-hover:scale-110`} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );

  // Success checkmark icon
  const CheckIcon = ({ className = "" }: { className?: string }) => (
    <svg 
      className={`${className} transition-all duration-300`} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );

  // Loading spinner
  const LoadingSpinner = ({ className = "" }: { className?: string }) => (
    <svg 
      className={`${className} animate-spin`} 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Get button text based on platform and state
  const getButtonText = () => {
    if (!showText) return null;
    
    if (showSuccess) return 'Installed!';
    if (isInstalling) return 'Installing...';
    
    switch (platform) {
      case 'ios':
        return 'Add to Home Screen';
      case 'android':
        return 'Install App';
      case 'desktop':
        return 'Install Chester';
      default:
        return 'Install App';
    }
  };

  // Get appropriate icon based on state
  const getIcon = () => {
    if (!showIcon) return null;
    
    const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6';
    
    if (showSuccess) {
      return <CheckIcon className={`${iconSize} text-emerald-300`} />;
    }
    
    if (isInstalling) {
      return <LoadingSpinner className={iconSize} />;
    }
    
    return <InstallIcon className={iconSize} />;
  };

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling || showSuccess}
      className={getButtonStyles()}
      aria-label={`Install Chester AI Chess app (${platform})`}
      type="button"
    >
      {/* Background animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
      
      {/* Content */}
      <span className="relative flex items-center justify-center gap-inherit">
        {getIcon()}
        {showText && (
          <span className="font-semibold whitespace-nowrap">
            {getButtonText()}
          </span>
        )}
      </span>

      {/* Success celebration animation */}
      {showSuccess && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-inherit animate-ping" />
          <div className="absolute inset-0 bg-emerald-500/10 rounded-inherit animate-pulse" />
        </div>
      )}
    </button>
  );
}