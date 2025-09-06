'use client';

import { MoveSuggestion } from '@/types';
import { motion } from 'framer-motion';

interface SuggestionBubbleProps {
  suggestions: MoveSuggestion[];
  onSelectSuggestion?: (move: string) => void;
}

export default function SuggestionBubble({ suggestions, onSelectSuggestion }: SuggestionBubbleProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                 border-l-4 border-blue-400 rounded-lg p-4 my-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-400 text-lg">💭</span>
        <span className="text-sm text-blue-300 font-medium">Chester's thinking...</span>
      </div>
      
      <div className="space-y-2">
        {suggestions.map((suggestion, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-2 group cursor-pointer
                       hover:bg-white/5 rounded p-2 transition-all"
            onClick={() => onSelectSuggestion?.(suggestion.move)}
          >
            <span className="text-purple-400 font-bold mt-0.5">
              {suggestions.length > 1 ? `${i + 1}.` : '→'}
            </span>
            <div className="flex-1">
              <p className="text-white group-hover:text-blue-300 transition-colors">
                {suggestion.move}
              </p>
              {suggestion.reasoning && (
                <p className="text-sm text-gray-400 mt-1">
                  {suggestion.reasoning}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {onSelectSuggestion && (
        <p className="text-xs text-gray-500 mt-3 italic">
          Click a suggestion to preview it on the board
        </p>
      )}
    </motion.div>
  );
}