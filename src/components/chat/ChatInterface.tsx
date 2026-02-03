'use client';

import { AnimatePresence, animate } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage as ChatMessageType } from '@/types';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';

interface ChatInterfaceProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const _lastScrollHeightRef = useRef(0);
  const userScrolledUpRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAnimationRef = useRef<{ stop: () => void } | null>(null);
  const lastTargetRef = useRef(0);
  const isAnimatingRef = useRef(false);

  // Smooth scroll using Framer Motion's animate for buttery smoothness
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetScroll = container.scrollHeight - container.clientHeight;

    if (!smooth) {
      container.scrollTop = targetScroll;
      return;
    }

    // If already animating toward a similar target, let it continue (don't jitter)
    if (isAnimatingRef.current && Math.abs(targetScroll - lastTargetRef.current) < 20) {
      return;
    }

    const startScroll = container.scrollTop;
    const distance = targetScroll - startScroll;

    // Don't animate if already at bottom
    if (Math.abs(distance) < 3) {
      container.scrollTop = targetScroll;
      return;
    }

    // Cancel previous animation if target changed
    if (scrollAnimationRef.current) {
      scrollAnimationRef.current.stop();
      scrollAnimationRef.current = null;
    }

    lastTargetRef.current = targetScroll;
    isAnimatingRef.current = true;

    // Use Framer Motion's animate for smooth, GPU-accelerated animation
    scrollAnimationRef.current = animate(startScroll, targetScroll, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1], // More dramatic easeOutExpo - very smooth deceleration
      onUpdate: (value) => {
        container.scrollTop = value;
      },
      onComplete: () => {
        scrollAnimationRef.current = null;
        isAnimatingRef.current = false;
      },
    });
  }, []);

  // Check if user is near the bottom (within 100px)
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Handle user scroll - detect if they scrolled up intentionally
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const nearBottom = isNearBottom();

    // User scrolled away from bottom
    if (!nearBottom) {
      userScrolledUpRef.current = true;
      setShowScrollButton(messages.length > 2);
    } else {
      userScrolledUpRef.current = false;
      setShowScrollButton(false);
    }
  }, [isNearBottom, messages.length]);

  // MutationObserver to watch for content changes (typing effect, new messages)
  useEffect(() => {
    const container = scrollContainerRef.current;
    const messagesContent = messagesContentRef.current;

    if (!container || !messagesContent) return;

    const observer = new MutationObserver(() => {
      // Only auto-scroll if user hasn't intentionally scrolled up
      if (!userScrolledUpRef.current || isNearBottom()) {
        // Debounce scroll calls - longer delay to let animation complete
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          scrollToBottom(true);
        }, 100); // 100ms debounce - let content settle
      }
    });

    observer.observe(messagesContent, {
      childList: true, // Watch for new messages
      subtree: true, // Watch nested elements
      characterData: true, // Watch text content changes (typing)
    });

    return () => {
      observer.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [scrollToBottom, isNearBottom]);

  // Scroll on new messages only (not content changes - MutationObserver handles that)
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      // Small delay to let new message render
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [scrollToBottom]);

  const handleScrollToBottomClick = useCallback(() => {
    userScrolledUpRef.current = false;
    setShowScrollButton(false);
    scrollToBottom(true);
  }, [scrollToBottom]);

  // Simplified orientation detection for CSS classes only
  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window === 'undefined') return;
      const mobile = window.innerWidth < 1024;
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(mobile && landscape);
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  // Simple message rendering
  const visibleMessages = useMemo(() => messages, [messages]);

  return (
    <section
      className={`chat-interface ${isLandscape ? 'landscape' : 'portrait'}`}
      aria-label="Chat with Chester, your chess coach"
    >
      <div
        ref={scrollContainerRef}
        className="chat-messages-container"
        onScroll={handleScroll}
      >
        {/* Message container with ref for MutationObserver */}
        <div
          ref={messagesContentRef}
          className="space-y-1"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          <AnimatePresence mode="popLayout">
            {visibleMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </AnimatePresence>
        </div>

        <div
          ref={messagesEndRef}
          style={{
            height: '1px',
            width: '100%',
          }}
        />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          type="button"
          onClick={handleScrollToBottomClick}
          className="absolute bottom-20 right-4 z-10 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 smooth-transitions gpu-accelerated touch-optimized"
          style={{ minWidth: '48px', minHeight: '48px' }}
          aria-label="Scroll to bottom"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
            <path
              d="M7 13L12 18L17 13M12 6V17"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Input */}
      <div className="chat-input-container">
        <ChatInput onSendMessage={onSendMessage} disabled={isLoading} />
      </div>
    </section>
  );
}
