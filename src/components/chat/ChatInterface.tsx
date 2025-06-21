'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 10;
    setIsAtBottom(isScrolledToBottom);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-950/80 to-slate-950/90 backdrop-blur-md rounded-t-2xl lg:rounded-2xl overflow-hidden">

      <div 
        className="flex-1 overflow-y-auto chat-messages mobile-chat-container"
        onScroll={handleScroll}
        style={{ minHeight: 0 }}
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

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={onSendMessage} disabled={isLoading} />
    </div>
  );
}