/**
 * React Hook for Chess Engine Web Worker
 * Provides smooth UI by running engine calculations off main thread
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface EngineResult {
  move: string;
  evaluation: number;
  depth: number;
  thinkingTime: number;
  analysis: string;
  fromBook: boolean;
  nodesSearched: number;
  ttHitRate: number;
}

interface UseChessEngineOptions {
  onThinking?: (isThinking: boolean) => void;
  onProgress?: (message: string) => void;
}

export function useChessEngine(options: UseChessEngineOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((result: EngineResult | null) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  // Initialize worker
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    try {
      // Create worker using the worker file
      workerRef.current = new Worker(new URL('../lib/chess/engine.worker.ts', import.meta.url), {
        type: 'module',
      });

      workerRef.current.onmessage = (e: MessageEvent) => {
        const { type, result } = e.data;

        if (type === 'result') {
          setIsThinking(false);
          options.onThinking?.(false);

          if (resolveRef.current) {
            resolveRef.current(result);
            resolveRef.current = null;
          }
        } else if (type === 'ttCleared') {
          console.log('[Engine] Transposition table cleared');
        }
      };

      workerRef.current.onerror = (e) => {
        console.error('[Engine Worker Error]', e);
        setError(e.message);
        setIsThinking(false);
        options.onThinking?.(false);

        if (rejectRef.current) {
          rejectRef.current(new Error(e.message));
          rejectRef.current = null;
        }
      };

      setIsReady(true);
      console.log('[Engine] Web Worker initialized successfully');
    } catch (err) {
      console.error('[Engine] Failed to initialize Web Worker:', err);
      setError('Failed to initialize chess engine');
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [options.onThinking]);

  // Get best move from engine
  const getBestMove = useCallback(
    (
      fen: string,
      difficulty: 'easy' | 'medium' | 'hard' = 'medium',
      playerMoveHistory: string[] = [],
    ): Promise<EngineResult | null> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          // Fallback: return null if worker not available
          console.warn('[Engine] Worker not available, returning null');
          resolve(null);
          return;
        }

        setIsThinking(true);
        options.onThinking?.(true);
        resolveRef.current = resolve;
        rejectRef.current = reject;

        workerRef.current.postMessage({
          type: 'getBestMove',
          fen,
          difficulty,
          playerMoveHistory,
        });
      });
    },
    [options],
  );

  // Clear transposition table (for new game)
  const clearTranspositionTable = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'clearTT' });
    }
  }, []);

  return {
    getBestMove,
    clearTranspositionTable,
    isReady,
    isThinking,
    error,
  };
}

// For use outside of React (API routes), we need a synchronous fallback
// This uses the enhanced engine directly on the main thread
export async function getEngineMoveSync(
  fen: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  playerMoveHistory: string[] = [],
): Promise<EngineResult | null> {
  // Dynamic import to avoid loading in client bundle
  const { EnhancedChessEngine } = await import('../lib/chess/engineEnhanced');
  const engine = new EnhancedChessEngine();
  return engine.getBestMove(fen, difficulty, playerMoveHistory);
}
