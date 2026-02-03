'use client';

import { motion } from 'framer-motion';

interface ThinkingIndicatorProps {
  name?: string; // "Chester" or "Engine"
  message?: string; // Custom thinking message
}

const TypingDots = () => (
  <div className="flex gap-0.5">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-1 h-1 bg-purple-400 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          delay: i * 0.2,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

export default function ThinkingIndicator({ name = 'Chester', message }: ThinkingIndicatorProps) {
  const displayMessage = message || `${name} is thinking`;

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-1.5 ml-12 mr-8 
                 bg-purple-500/10 border border-purple-400/20 rounded-full
                 max-w-fit"
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -5 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        duration: 0.3,
      }}
    >
      {/* Avatar indicator */}
      <motion.div
        className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Thinking text */}
      <span className="text-xs text-purple-300 font-medium">{displayMessage}</span>

      {/* Animated typing dots */}
      <TypingDots />
    </motion.div>
  );
}
