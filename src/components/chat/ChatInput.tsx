'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle mobile keyboard appearance without disruptive scrolling
  useEffect(() => {
    const handleFocus = () => {
      if (window.innerWidth < 1024) { // Mobile
        setIsKeyboardOpen(true);
        // Dispatch custom event for layout to handle
        window.dispatchEvent(new Event('keyboard-open'));
      }
    };

    const handleBlur = () => {
      setIsKeyboardOpen(false);
      // Dispatch custom event for layout to handle
      window.dispatchEvent(new Event('keyboard-close'));
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('focus', handleFocus);
      textarea.addEventListener('blur', handleBlur);
      
      return () => {
        textarea.removeEventListener('focus', handleFocus);
        textarea.removeEventListener('blur', handleBlur);
      };
    }
  }, []);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`border-t border-purple-400/20 bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-900/30 p-2 lg:p-6 backdrop-blur-sm chat-input-container lg:rounded-b-2xl ${isKeyboardOpen ? 'mobile-keyboard-active' : ''}`}>
      <div className="max-w-3xl mx-auto relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none rounded-xl lg:rounded-2xl border-2 border-purple-400/30 bg-slate-900/80 backdrop-blur-sm px-3 lg:px-6 py-3 lg:py-6 pr-12 lg:pr-18 text-sm lg:text-lg text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl font-medium scrollbar-hide overflow-hidden"
          style={{ maxHeight: '200px', minHeight: '40px' }}
        />
        
        <button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="absolute right-2 lg:right-4 bottom-2 lg:bottom-5 p-2 lg:p-4 rounded-lg lg:rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 glow-effect"
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