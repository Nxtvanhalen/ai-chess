'use client';

import { motion } from 'framer-motion';
import { EngineAnalysis } from '@/types';

interface CompactEngineMoveProps {
  move: string;
  analysis?: EngineAnalysis;
  commentary?: string;
}

export default function CompactEngineMove({ move, analysis, commentary }: CompactEngineMoveProps) {
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
      
      {/* Chester's commentary (if any) appears as a regular message */}
      {commentary && (
        <motion.div
          className="flex gap-1 lg:gap-4 px-1 lg:px-6 py-1 lg:py-6 
                     bg-gradient-to-r from-purple-900/20 via-blue-900/10 to-purple-900/20 
                     border-l-4 border-purple-400/40 rounded-r-2xl mx-0 lg:mx-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="flex-shrink-0">
            <div className="w-5 h-5 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 glow-effect shadow-lg overflow-hidden relative">
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs lg:text-lg font-bold">
                ♛
              </span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs lg:text-sm font-semibold text-purple-300">
                Chester
              </span>
            </div>
            
            <div className="prose prose-sm lg:prose-base prose-invert max-w-none">
              <p className="text-xs lg:text-sm text-slate-200 leading-relaxed mb-0 break-words">
                {commentary}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}