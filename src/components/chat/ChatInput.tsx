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
  placeholder = "Message Chess Butler..."
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

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
    <div className="border-t border-purple-400/20 bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-900/30 p-4 lg:p-6 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none rounded-xl lg:rounded-2xl border-2 border-purple-400/30 bg-slate-900/80 backdrop-blur-sm px-5 lg:px-6 py-5 lg:py-6 pr-16 lg:pr-18 text-base lg:text-lg text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
          style={{ maxHeight: '200px', minHeight: '56px' }}
        />
        
        <button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="absolute right-3 lg:right-4 bottom-4 lg:bottom-5 p-3 lg:p-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 glow-effect"
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