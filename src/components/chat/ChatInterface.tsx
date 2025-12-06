'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingIndicator from './LoadingIndicator';
import { ChatMessage as ChatMessageType } from '@/types';

interface ChatInterfaceProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const lastScrollHeightRef = useRef(0);
  const userScrolledUpRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth scroll to bottom using native CSS smooth scrolling
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use requestAnimationFrame for smoother timing
    requestAnimationFrame(() => {
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
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
        // Debounce scroll calls during rapid updates (typing)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          scrollToBottom(true);
        }, 16); // ~60fps timing
      }
    });

    observer.observe(messagesContent, {
      childList: true,      // Watch for new messages
      subtree: true,        // Watch nested elements
      characterData: true,  // Watch text content changes (typing)
    });

    return () => {
      observer.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [scrollToBottom, isNearBottom]);

  // Also scroll on messages array changes (catches structural updates)
  useEffect(() => {
    // Reset user scroll flag on new messages - they probably want to see new content
    if (!userScrolledUpRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
  }, [messages.length, scrollToBottom]);

  // Initial scroll and scroll on any message content change
  useEffect(() => {
    // Create a content signature from message contents
    const contentSignature = messages.map(m => m.content?.length || 0).join(',');

    if (!userScrolledUpRef.current) {
      scrollToBottom(true);
    }
  }, [messages, scrollToBottom]);

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
    <div className={`chat-interface ${isLandscape ? 'landscape' : 'portrait'}`}>
      <div 
        ref={scrollContainerRef}
        className="chat-messages-container"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div className="max-w-md space-y-6">
              <div className="relative">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-2xl glow-effect">
                  ♔
                </div>
                <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-400 opacity-50 blur-md animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Welcome, Chris
                </h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  I&apos;m Chester, your chess companion, ready to assist with strategic insights, 
                  thoughtful analysis, and perhaps a dash of wisdom. Make your opening move 
                  or share what&apos;s on your mind.
                </p>
                <div className="flex justify-center space-x-2 pt-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message container with ref for MutationObserver */}
        <div ref={messagesContentRef} className="space-y-1">
          {visibleMessages.map((message) => (
            <div key={message.id} className="w-full">
              <ChatMessage message={message} />
            </div>
          ))}
        </div>
        
        <div 
          ref={messagesEndRef} 
          style={{ 
            height: '1px',
            width: '100%'
          }} 
        />
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={handleScrollToBottomClick}
          className="absolute bottom-20 right-4 z-10 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 smooth-transitions gpu-accelerated touch-optimized"
          style={{ minWidth: '48px', minHeight: '48px' }}
          aria-label="Scroll to bottom"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="text-current"
          >
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

      {/* Input - CSS-only positioning */}
      <div className="chat-input-container">
        <ChatInput onSendMessage={onSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}