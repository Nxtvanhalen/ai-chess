'use client';

import { useEffect } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ai_move' | 'chat';
  resetAt?: string;
}

export default function UpgradeModal({ isOpen, onClose, type, resetAt }: UpgradeModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetTime = resetAt
    ? new Date(resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'midnight UTC';

  const title = type === 'ai_move'
    ? "You've reached your daily move limit"
    : "You've reached your daily chat limit";

  const description = type === 'ai_move'
    ? "You've used all your AI moves for today. Upgrade to Pro for 500 moves/day or Premium for unlimited!"
    : "You've used all your chat messages for today. Upgrade for more conversations with Chester!";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-white text-center mb-3">
          {title}
        </h2>
        <p className="text-gray-400 text-center mb-6">
          {description}
        </p>

        {/* Reset time */}
        <p className="text-sm text-gray-500 text-center mb-6">
          Your limit resets at {resetTime}
        </p>

        {/* Plan comparison */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-purple-400 font-semibold mb-2">Pro</h3>
            <p className="text-2xl font-bold text-white mb-1">$9.99<span className="text-sm text-gray-500">/mo</span></p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>500 AI moves/day</li>
              <li>200 chat messages</li>
            </ul>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-amber-500/30">
            <h3 className="text-amber-400 font-semibold mb-2">Premium</h3>
            <p className="text-2xl font-bold text-white mb-1">$19.99<span className="text-sm text-gray-500">/mo</span></p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>Unlimited moves</li>
              <li>Unlimited chat</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a
            href="/pricing"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl text-center transition-colors"
          >
            View Plans
          </a>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
