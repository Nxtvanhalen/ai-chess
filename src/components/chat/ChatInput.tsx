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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialViewportHeight = useRef<number>(0);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Orientation detection for responsive width
  useEffect(() => {
    const updateOrientation = () => {
      const mobile = window.innerWidth < 1024;
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(mobile && landscape);
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateOrientation, 100);
    });

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  // Enhanced mobile keyboard detection with Visual Viewport API
  useEffect(() => {
    // Store initial viewport height
    initialViewportHeight.current = window.innerHeight;
    
    const isMobile = window.innerWidth < 1024;
    if (!isMobile) return;
    
    // Use Visual Viewport API when available (modern browsers)
    if (window.visualViewport) {
      const handleViewportChange = () => {
        const currentHeight = window.visualViewport!.height;
        const heightDifference = initialViewportHeight.current - currentHeight;
        const threshold = 150; // Minimum keyboard height to consider
        
        if (heightDifference > threshold) {
          setIsKeyboardOpen(true);
          setKeyboardHeight(heightDifference);
          window.dispatchEvent(new CustomEvent('keyboard-open', { 
            detail: { height: heightDifference } 
          }));
        } else {
          setIsKeyboardOpen(false);
          setKeyboardHeight(0);
          window.dispatchEvent(new Event('keyboard-close'));
        }
      };
      
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    } else {
      // Fallback for older browsers - use window resize
      const handleResize = () => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight.current - currentHeight;
        const threshold = 150;
        
        if (heightDifference > threshold) {
          setIsKeyboardOpen(true);
          setKeyboardHeight(heightDifference);
          window.dispatchEvent(new CustomEvent('keyboard-open', { 
            detail: { height: heightDifference } 
          }));
        } else {
          setIsKeyboardOpen(false);
          setKeyboardHeight(0);
          window.dispatchEvent(new Event('keyboard-close'));
        }
      };
      
      // Add debouncing to prevent excessive calls
      let timeoutId: NodeJS.Timeout;
      const debouncedResize = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(handleResize, 100);
      };
      
      window.addEventListener('resize', debouncedResize);
      return () => {
        window.removeEventListener('resize', debouncedResize);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  const handleSubmit = async () => {
    if (message.trim() && !disabled) {
      // Enhanced haptic feedback for message send
      await haptics.messageSent();
      
      onSendMessage(message.trim());
      setMessage('');
      
      // Auto-blur on mobile after sending to hide keyboard
      if (window.innerWidth < 1024 && textareaRef.current) {
        textareaRef.current.blur();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div 
      className={`border-t border-purple-400/20 bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm chat-input-container lg:rounded-b-2xl transition-all duration-300 ease-out mobile-chat-input-container ${
        isLandscape 
          ? 'p-2' // Minimal padding in landscape
          : 'p-2 lg:p-6 mobile-safe-area-bottom' // Normal padding in portrait/desktop with safe area
      } ${isKeyboardOpen ? 'mobile-keyboard-active' : ''}`}
      style={{
        transform: isKeyboardOpen && keyboardHeight > 0 
          ? `translateY(${Math.min(-keyboardHeight + 20, -100)}px)` 
          : 'translateY(0)',
        willChange: 'transform',
      }}>
      <div className={`relative ${
        isLandscape 
          ? 'w-full px-2' // Full width in landscape with minimal padding
          : 'max-w-3xl mx-auto' // Centered and constrained in portrait/desktop
      }`}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none rounded-xl lg:rounded-2xl border-2 border-purple-400/30 bg-slate-900/80 backdrop-blur-sm px-3 lg:px-6 py-3 lg:py-6 pr-12 lg:pr-18 text-sm lg:text-lg text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed smooth-transitions shadow-lg hover:shadow-xl font-medium scrollbar-hide overflow-hidden touch-optimized"
          style={{ 
            maxHeight: '200px', 
            minHeight: '40px',
            minTouchTarget: '44px', // Accessibility touch target
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