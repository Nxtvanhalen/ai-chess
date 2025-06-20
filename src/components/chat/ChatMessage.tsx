'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  
  return (
    <div className={`flex gap-3 lg:gap-4 px-4 lg:px-6 py-3 lg:py-5 message-animate transition-all duration-300 ${
      isAssistant 
        ? 'bg-gradient-to-r from-purple-900/20 via-blue-900/10 to-purple-900/20 border-l-2 border-purple-400/30' 
        : 'hover:bg-purple-900/10'
    }`}>
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold shadow-lg ${
          isAssistant 
            ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white glow-effect' 
            : 'bg-gradient-to-br from-slate-600 to-slate-700 text-white'
        }`}>
          {isAssistant ? 'CB' : 'C'}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`font-bold text-sm ${
            isAssistant 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' 
              : 'text-slate-900 dark:text-slate-100'
          }`}>
            {isAssistant ? 'Chess Butler' : 'Chris'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        
        <div className="markdown-content prose prose-sm max-w-none prose-invert prose-p:leading-relaxed prose-headings:font-bold prose-a:text-blue-400 text-slate-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children }) => (
                <pre className="overflow-x-auto">{children}</pre>
              ),
              code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !className || !match;
                return isInline ? (
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}