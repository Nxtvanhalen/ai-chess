'use client';

import { ChatMessage as ChatMessageType } from '@/types';
import { motion } from 'framer-motion';
import Image from 'next/image';
import SuggestionBubble from './SuggestionBubble';
import EngineMoveCard from './EngineMoveCard';
import LoadingIndicator from './LoadingIndicator';
import DynamicMarkdown from './DynamicMarkdown';

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
  const isEngine = message.role === 'engine';
  const isThinking = message.metadata?.isThinking;
  
  // Handle engine move display
  if (isEngine || message.type === 'move' && message.metadata?.engineAnalysis) {
    // Show thinking indicator if engine is thinking
    if (isThinking) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-red-500/10 to-orange-500/10 
                     border-l-4 border-red-500 rounded-lg p-4 my-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400 text-xl">🤖</span>
            <span className="text-sm text-red-300 font-medium">Engine is thinking</span>
          </div>
          
          <div className="bg-black/30 rounded p-3">
            <div className="flex items-center gap-2">
              <LoadingIndicator />
              <span className="text-gray-300 text-sm italic">
                {message.metadata?.analysis || 'Analyzing position...'}
              </span>
            </div>
          </div>
        </motion.div>
      );
    }
    
    return (
      <EngineMoveCard 
        move={message.content}
        analysis={message.metadata?.engineAnalysis}
      />
    );
  }
  
  // Handle suggestion display
  if (message.type === 'suggestion' && message.metadata?.suggestions) {
    return (
      <div className="animate-in slide-in-from-bottom-6 fade-in duration-700">
        <SuggestionBubble suggestions={message.metadata.suggestions} />
      </div>
    );
  }
  
  // Show thinking animation separately
  if (isThinking) {
    return (
      <div className="flex gap-1 lg:gap-4 px-1 lg:px-6 py-1 lg:py-6 animate-in slide-in-from-bottom-6 lg:slide-in-from-bottom-8 fade-in duration-700 lg:duration-1000 ease-out bg-gradient-to-r from-purple-900/20 via-blue-900/10 to-purple-900/20 border-l-4 border-purple-400/40 rounded-r-2xl mx-0 lg:mx-2">
        <div className="flex-shrink-0">
          <div className="w-5 h-5 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 glow-effect shadow-lg overflow-hidden relative animate-pulse">
            <Image
              src="/chester.png"
              alt="Chester"
              width={40}
              height={40}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              priority
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs lg:text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Chester</span>
          <div className="flex items-center gap-1">
            <div className="thinking-dot w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-400 rounded-full"></div>
            <div className="thinking-dot w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-400 rounded-full"></div>
            <div className="thinking-dot w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-400 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex gap-1 lg:gap-4 px-1 lg:px-6 py-1 lg:py-6 animate-in slide-in-from-bottom-6 lg:slide-in-from-bottom-8 fade-in duration-700 lg:duration-1000 ease-out ${
      isAssistant 
        ? 'bg-gradient-to-r from-purple-900/20 via-blue-900/10 to-purple-900/20 border-l-4 border-purple-400/40 rounded-r-2xl mx-0 lg:mx-2' 
        : 'hover:bg-purple-900/10 rounded-l-2xl mx-0 lg:mx-2'
    }`}>
      <div className="flex-shrink-0">
        {isAssistant ? (
          <div className="w-5 h-5 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 glow-effect shadow-lg overflow-hidden relative">
            <Image
              src="/chester.png"
              alt="Chester"
              width={40}
              height={40}
              className="absolute inset-0 w-full h-full object-cover opacity-100"
              priority
            />
          </div>
        ) : (
          <div className="w-5 h-5 lg:w-10 lg:h-10 rounded-full overflow-hidden shadow-lg relative">
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
        <div className="flex items-baseline gap-1 mb-1">
          <span className={`font-bold text-xs lg:text-sm ${
            isAssistant 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' 
              : 'text-slate-900 dark:text-slate-100'
          }`}>
            {isAssistant ? 'Chester' : 'Chris'}
          </span>
          <span className="text-xs lg:text-xs text-slate-500 dark:text-slate-400 font-medium hidden lg:inline">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        
        <div className={`markdown-content prose prose-sm max-w-none prose-invert prose-p:leading-tight prose-p:mb-0 prose-headings:font-bold prose-a:text-blue-400 text-slate-200 text-sm lg:text-base ${
          isAssistant 
            ? 'bg-purple-900/15 px-1 py-0.5 lg:p-4 rounded-md lg:rounded-2xl border border-purple-400/30 shadow-lg backdrop-blur-sm' 
            : 'bg-slate-800/25 px-1 py-0.5 lg:p-4 rounded-md lg:rounded-2xl border border-slate-400/30 shadow-lg backdrop-blur-sm'
        }`}>
          <DynamicMarkdown>
            {message.content}
          </DynamicMarkdown>
        </div>
      </div>
    </div>
  );
}