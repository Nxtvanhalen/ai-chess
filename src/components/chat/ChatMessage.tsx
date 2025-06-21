'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '@/types';
import Image from 'next/image';

interface ChatMessageProps {
  message: ChatMessageType;
}

const HighlightedText = ({ children }: { children: string }) => {
  // Pattern to match chess moves like "Knight to E4", "Pawn to D5", "castles kingside", etc.
  const movePattern = /((?:King|Queen|Rook|Bishop|Knight|Pawn)\s+to\s+[A-H][1-8]|castles\s+(?:kingside|queenside))/gi;
  
  const parts = children.split(movePattern);
  
  return (
    <>
      {parts.map((part, index) => {
        if (movePattern.test(part)) {
          return (
            <span 
              key={index}
              className="chess-move-highlight font-semibold text-blue-300"
              style={{
                textShadow: '0 0 12px rgba(59, 130, 246, 0.8), 0 0 6px rgba(59, 130, 246, 0.6)',
              }}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const isThinking = message.metadata?.isThinking;
  
  return (
    <div className={`flex gap-3 lg:gap-4 px-4 lg:px-6 py-4 lg:py-6 animate-in slide-in-from-bottom-6 lg:slide-in-from-bottom-8 fade-in duration-700 lg:duration-1000 ease-out ${
      isAssistant 
        ? 'bg-gradient-to-r from-purple-900/20 via-blue-900/10 to-purple-900/20 border-l-4 border-purple-400/40 rounded-r-2xl mx-2' 
        : 'hover:bg-purple-900/10 rounded-l-2xl mx-2'
    }`}>
      <div className="flex-shrink-0">
        {isAssistant ? (
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white glow-effect flex items-center justify-center text-lg shadow-lg">
            {isThinking ? '🤔' : '🤓'}
          </div>
        ) : (
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden shadow-lg relative">
            <img
              src="/profile.jpg"
              alt="Chris"
              className="absolute inset-0 w-full h-full"
              style={{
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          </div>
        )}
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
        
        <div className={`markdown-content prose prose-sm max-w-none prose-invert prose-p:leading-relaxed prose-headings:font-bold prose-a:text-blue-400 text-slate-200 ${
          isAssistant 
            ? 'bg-purple-900/15 p-4 rounded-2xl border border-purple-400/30 shadow-lg backdrop-blur-sm' 
            : 'bg-slate-800/25 p-4 rounded-2xl border border-slate-400/30 shadow-lg backdrop-blur-sm'
        }`}>
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
              p: ({ children }) => (
                <p><HighlightedText>{String(children)}</HighlightedText></p>
              ),
              text: ({ children }) => {
                if (typeof children === 'string') {
                  return <HighlightedText>{children}</HighlightedText>;
                }
                return children;
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}