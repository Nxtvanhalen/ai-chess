'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  
  // Virtual scrolling constants
  const ITEM_HEIGHT = 120; // Approximate height per message
  const BUFFER_SIZE = 5; // Render extra items for smooth scrolling

  const scrollToBottom = (force: boolean = false) => {
    const container = scrollContainerRef.current;
    const endElement = messagesEndRef.current;
    
    if (container && endElement) {
      // Force immediate scroll for new messages
      if (force) {
        container.scrollTop = container.scrollHeight;
      } else {
        // Smooth scroll for user-initiated scrolling
        endElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
    }
  };

  // Enhanced auto-scroll with IntersectionObserver
  useEffect(() => {
    // Always force scroll to bottom when new messages arrive
    // Increased delay for virtual scrolling DOM updates
    const scrollTimeout = setTimeout(() => {
      scrollToBottom(true); // Force scroll
    }, 50);
    
    return () => clearTimeout(scrollTimeout);
  }, [messages]);
  
  // Setup IntersectionObserver for scroll button visibility
  useEffect(() => {
    const endElement = messagesEndRef.current;
    const container = scrollContainerRef.current;
    
    if (!endElement || !container) return;
    
    intersectionObserverRef.current = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsAtBottom(isVisible);
        setShowScrollButton(!isVisible && messages.length > 3);
      },
      {
        root: container,
        rootMargin: '0px 0px -20px 0px', // Trigger slightly before fully visible
        threshold: 0.1
      }
    );
    
    intersectionObserverRef.current.observe(endElement);
    
    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, [messages.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setScrollTop(scrollTop);
    
    // Update scroll button visibility based on scroll position
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShowScrollButton(!isScrolledToBottom && messages.length > 3);
  };
  
  const handleScrollToBottomClick = () => {
    scrollToBottom(false); // Smooth scroll on manual click
  };
  
  // Resize observer to track container height
  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(messagesContainer);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Virtual scrolling calculation - only render visible messages
  const visibleMessages = useMemo(() => {
    if (messages.length <= 20) {
      // For short lists, render everything
      return messages;
    }
    
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      messages.length, 
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );
    
    return messages.slice(startIndex, endIndex).map((message, index) => ({
      ...message,
      virtualIndex: startIndex + index
    }));
  }, [messages, scrollTop, containerHeight]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-950/80 to-slate-950/90 backdrop-blur-md rounded-t-2xl lg:rounded-2xl overflow-hidden relative">

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto chat-messages mobile-chat-container momentum-scroll gpu-accelerated"
        onScroll={handleScroll}
        style={{ 
          minHeight: 0,
          overscrollBehavior: 'contain',
          scrollBehavior: 'smooth',
        }}
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

        {/* Virtual scrolling container */}
        <div 
          style={{
            height: messages.length > 20 ? `${messages.length * ITEM_HEIGHT}px` : 'auto',
            position: 'relative'
          }}
        >
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              style={{
                position: messages.length > 20 ? 'absolute' : 'relative',
                top: messages.length > 20 && 'virtualIndex' in message 
                  ? `${(message as any).virtualIndex * ITEM_HEIGHT}px` 
                  : 'auto',
                width: '100%',
                minHeight: messages.length > 20 ? `${ITEM_HEIGHT}px` : 'auto'
              }}
            >
              <ChatMessage message={message} />
            </div>
          ))}
        </div>
        
        <div 
          ref={messagesEndRef} 
          style={{ 
            height: '1px',
            position: messages.length > 20 ? 'absolute' : 'relative',
            bottom: 0,
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

      <ChatInput onSendMessage={onSendMessage} disabled={isLoading} />
    </div>
  );
}