'use client';

import { EngineAnalysis } from '@/types';
import { motion } from 'framer-motion';

interface EngineMoveCardProps {
  move: string;
  analysis?: EngineAnalysis;
}

export default function EngineMoveCard({ move, analysis }: EngineMoveCardProps) {
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
        <span className="text-sm text-red-300 font-medium">Engine plays</span>
      </div>
      
      <div className="bg-black/30 rounded p-3">
        <p className="font-mono text-lg text-white font-semibold">
          {move}
        </p>
        
        {analysis && (
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-gray-400">
              Depth: {analysis.depth}
            </span>
            <span className={`${analysis.evaluation > 0 ? 'text-green-400' : analysis.evaluation < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              Eval: {analysis.evaluation > 0 ? '+' : ''}{analysis.evaluation.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}