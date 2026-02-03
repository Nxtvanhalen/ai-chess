'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAWelcomeProps {
  showOnFirstInstall?: boolean;
  autoHideAfter?: number;
  className?: string;
}

/**
 * PWA Welcome Component
 *
 * Celebrates successful app installation with:
 * - Welcome message for newly installed users
 * - App shortcuts introduction
 * - Standalone mode detection and features showcase
 * - Chester-themed celebration animation
 * - First-time user onboarding hints
 */
export default function PWAWelcome({
  showOnFirstInstall = true,
  autoHideAfter = 8000,
  className = '',
}: PWAWelcomeProps) {
  const { isInstalled, isStandalone } = usePWAInstall();

  const [showWelcome, setShowWelcome] = useState(false);
  const [_isFirstInstall, setIsFirstInstall] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<'enter' | 'celebrate' | 'exit'>('enter');

  // Check if this is the first time opening the installed app
  useEffect(() => {
    if (isStandalone && showOnFirstInstall) {
      try {
        const hasShownWelcome = localStorage.getItem('chester-pwa-welcome-shown');

        if (!hasShownWelcome) {
          console.log('[PWA Welcome] First install detected, showing welcome');
          setIsFirstInstall(true);
          setShowWelcome(true);
          localStorage.setItem('chester-pwa-welcome-shown', 'true');

          // Celebration sequence
          setTimeout(() => setCelebrationPhase('celebrate'), 500);
          setTimeout(() => setCelebrationPhase('exit'), autoHideAfter - 1000);

          // Auto-hide
          setTimeout(() => {
            setShowWelcome(false);
          }, autoHideAfter);
        }
      } catch (error) {
        console.error('[PWA Welcome] Failed to check welcome status:', error);
      }
    }
  }, [isStandalone, showOnFirstInstall, autoHideAfter]);

  const handleDismiss = useCallback(() => {
    setCelebrationPhase('exit');
    setTimeout(() => {
      setShowWelcome(false);
    }, 300);
  }, []);

  // Don't render if not installed or welcome shouldn't show
  if (!showWelcome || !isStandalone) {
    return null;
  }

  // Celebration particles component
  const CelebrationParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`absolute w-2 h-2 rounded-full animate-ping ${
            i % 3 === 0 ? 'bg-yellow-400' : i % 3 === 1 ? 'bg-blue-400' : 'bg-purple-400'
          }`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1 + Math.random()}s`,
          }}
        />
      ))}
    </div>
  );

  // Chester crown icon for celebration
  const CrownIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 16L3 3l5.5 5L12 4l3.5 4L21 3l-2 13H5zm2.7-2h8.6l.9-5.4-2.1 1.4L12 8l-3.1 2L6.8 8.6L7.7 14z" />
    </svg>
  );

  // Trophy icon
  const TrophyIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M7 4V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h4a1 1 0 0 1 1 1v5a3 3 0 0 1-3 3h-1.08A7.996 7.996 0 0 1 12 16a7.996 7.996 0 0 1-5.92-3H5a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1h4zM9 3v1h6V3H9zm10 2H5v4c0 .35.06.687.17 1H6a1 1 0 0 0 0 2h1.08c.832 1.205 1.993 2.24 3.42 2.757V18h-2a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-2v-3.243c1.427-.517 2.588-1.552 3.42-2.757H19a1 1 0 0 0 0-2h-.83c.11-.313.17-.65.17-1V5z" />
    </svg>
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${
        celebrationPhase === 'exit' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      } ${className}`}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Celebration particles */}
      {celebrationPhase === 'celebrate' && <CelebrationParticles />}

      {/* Welcome card */}
      <div
        className={`relative max-w-md w-full bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl shadow-3xl border border-purple-500/30 overflow-hidden transition-all duration-700 ${
          celebrationPhase === 'celebrate' ? 'scale-105 shadow-purple-500/50' : ''
        }`}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-indigo-600/20 to-blue-600/20 animate-pulse" />

        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Header with crown animation */}
          <div className="mb-6">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full mb-4 transform transition-all duration-700 ${
                celebrationPhase === 'celebrate' ? 'scale-110 rotate-12' : 'scale-100 rotate-0'
              }`}
            >
              <CrownIcon className="w-10 h-10 text-yellow-900" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">Welcome to Chester!</h1>

            <p className="text-purple-200 text-lg">Your chess companion is now installed</p>
          </div>

          {/* Features showcase */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Lightning Fast</div>
                <div className="text-sm text-purple-200">Instant loading, no waiting</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Works Offline</div>
                <div className="text-sm text-purple-200">Play anywhere, anytime</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <TrophyIcon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Native Experience</div>
                <div className="text-sm text-purple-200">Full-screen chess mastery</div>
              </div>
            </div>
          </div>

          {/* App shortcuts hint */}
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="font-semibold text-amber-200">Pro Tip</span>
            </div>
            <p className="text-sm text-amber-100">
              Right-click the Chester icon for quick shortcuts to start new games!
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={handleDismiss}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            Let's Play Chess!
          </button>

          {/* Skip option */}
          <button
            onClick={handleDismiss}
            className="mt-4 text-sm text-purple-300 hover:text-purple-200 transition-colors duration-200"
          >
            Skip welcome
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full animate-pulse" />
        <div className="absolute bottom-4 left-4 w-8 h-8 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full animate-ping" />
      </div>
    </div>
  );
}
