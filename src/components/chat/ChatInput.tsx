'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { haptics } from '@/lib/utils/haptics';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Message Chester...',
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

  // Simple orientation detection (minimal logic)
  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window === 'undefined') return;
      const mobile = window.innerWidth < 1024;
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(mobile && landscape);
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);

    return () => window.removeEventListener('resize', updateOrientation);
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
    <div className={`chat-input ${isLandscape ? 'landscape' : 'portrait'}`}>
      <div className="input-wrapper">
        <input
          ref={textareaRef as any}
          type="text"
          id="chat-message-input"
          name="chat-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          inputMode="text"
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck="true"
          data-form-type="other"
          enterKeyHint="send"
          // Critical iOS attributes to minimize accessory bar
          data-testid="chat-input"
          aria-label="Chat message input"
          x-webkit-speech=""
          webkit-appearance="none"
          className="chat-text-input"
          style={{
            minHeight: '44px', // Accessibility touch target minimum
            WebkitAppearance: 'none',
            appearance: 'none',
            WebkitUserSelect: 'text',
            userSelect: 'text',
          }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="chat-send-button"
          style={{ minWidth: '44px', minHeight: '44px' }} // Accessibility touch target
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
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
