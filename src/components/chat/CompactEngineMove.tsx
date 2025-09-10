'use client';

import { motion } from 'framer-motion';
import { EngineAnalysis } from '@/types';

interface CompactEngineMoveProps {
  move: string;
  analysis?: EngineAnalysis;
}

export default function CompactEngineMove({ move, analysis }: CompactEngineMoveProps) {
  return (
    <div className="space-y-2">
      {/* Compact engine move notification */}
      <motion.div 
        className="flex items-center gap-2 px-3 py-2 mx-4 my-1
                   bg-slate-800/40 border border-slate-600/30 rounded-lg
                   backdrop-blur-sm max-w-fit ml-auto"
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          duration: 0.4
        }}
      >
        {/* Engine indicator dot */}
        <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
        
        {/* Move notation */}
        <span className="text-sm text-slate-200 font-mono font-medium">
          {move}
        </span>
        
        {/* Analysis info (compact) */}
        {analysis && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>D{analysis.depth}</span>
            <span>•</span>
            <span className={
              analysis.evaluation > 0 
                ? 'text-green-400' 
                : analysis.evaluation < 0 
                  ? 'text-red-400' 
                  : 'text-slate-400'
            }>
              {analysis.evaluation > 0 ? '+' : ''}{analysis.evaluation.toFixed(1)}
            </span>
            {Math.abs(analysis.evaluation) > 2 && (
              <>
                <span>•</span>
                <span className={analysis.evaluation > 0 ? 'text-green-300' : 'text-red-300'}>
                  {analysis.evaluation > 2 ? '↗' : '↘'}
                </span>
              </>
            )}
          </div>
        )}
      </motion.div>
      
    </div>
  );
}