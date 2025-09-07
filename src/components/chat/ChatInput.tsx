'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { haptics } from '@/lib/utils/haptics';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Message Chester..."
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isLandscape, setIsLandscape] = useState(false);
  const textareaRef = useRef<HTMLInputElement>(null);

  // Input doesn't need auto-resize like textarea did
  // useEffect(() => {
  //   if (textareaRef.current) {
  //     textareaRef.current.style.height = 'auto';
  //     textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  //   }
  // }, [message]);

  // Simple orientation detection for responsive width
  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window === 'undefined') return;
      const mobile = window.innerWidth < 1024;
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(mobile && landscape);
    };

    updateOrientation();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateOrientation);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateOrientation);
      }
    };
  }, []);

  // Removed old keyboard detection - now handled by KeyboardManager

  const handleSubmit = async () => {
    if (message.trim() && !disabled) {
      // Enhanced haptic feedback for message send
      await haptics.messageSent();
      
      onSendMessage(message.trim());
      setMessage('');
      
      // Auto-blur on mobile after sending
      if (typeof window !== 'undefined' && window.innerWidth < 1024 && textareaRef.current) {
        textareaRef.current.blur();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div 
      id="mobile-chat-input-fix"
      className={`bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 backdrop-blur-sm transition-all duration-300 ease-out ${
        isLandscape 
          ? 'p-2' // Minimal padding in landscape
          : 'p-2 lg:p-6' // Minimal padding on mobile, standard on desktop
      }`}>
      <div className={`relative ${
        isLandscape 
          ? 'w-full px-2' // Full width in landscape with minimal padding
          : 'max-w-3xl mx-auto px-2' // Centered and constrained in portrait/desktop with padding
      }`} style={{ margin: 0 }}>
        <input
          ref={textareaRef as any}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-form-type="other"
          enterKeyHint="send"
          // Critical iOS attributes to minimize accessory bar
          data-testid="chat-input"
          role="textbox"
          aria-label="Chat message input"
          x-webkit-speech=""
          webkit-appearance="none"
          className="w-full rounded-xl lg:rounded-2xl border-2 border-purple-400/30 bg-slate-900/80 backdrop-blur-sm px-3 lg:px-6 py-3 lg:py-6 pr-12 lg:pr-18 text-sm lg:text-lg text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed smooth-transitions shadow-lg hover:shadow-xl font-medium touch-optimized"
          style={{ 
            minHeight: '44px', // Accessibility touch target minimum
            WebkitAppearance: 'none',
            appearance: 'none',
            WebkitUserSelect: 'text',
            userSelect: 'text'
          }}
        />
        
        <button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="absolute right-2 lg:right-4 bottom-2 lg:bottom-5 p-2 lg:p-4 rounded-lg lg:rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-30 disabled:cursor-not-allowed smooth-transitions shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 glow-effect gpu-accelerated touch-optimized"
          style={{ minWidth: '44px', minHeight: '44px' }} // Accessibility touch target
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-current"
          >
            <path
              d="M7 11L12 6L17 11M12 18V7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}