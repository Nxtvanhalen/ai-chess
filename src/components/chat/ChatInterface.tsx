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
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-950/80 to-slate-950/90 backdrop-blur-md">
      <div className="flex-shrink-0 border-b border-purple-400/20 p-4 lg:p-6 bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm lg:text-lg shadow-lg glow-effect">
            CB
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate">Chess Butler</h2>
            <p className="text-xs lg:text-sm text-slate-300 font-medium truncate">
              Your dignified AI chess companion
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto chat-messages"
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
                  I&apos;m your Chess Butler, ready to assist with strategic insights, 
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

        {isLoading && <LoadingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={onSendMessage} disabled={isLoading} />
    </div>
  );
}