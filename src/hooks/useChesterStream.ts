/**
 * React Hook for Streaming Chester Responses
 * Provides real-time character-by-character chat responses with typing effect
 */

import { useCallback, useRef, useState } from 'react';

interface StreamOptions {
  onChunk?: (text: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  /** Delay between characters in ms (default: 20) */
  typingDelay?: number;
}

interface GameContext {
  fen?: string;
  lastMove?: string;
  totalMoves?: number;
}

export function useChesterStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const textChunksRef = useRef<string[]>([]);
  const textBufferRef = useRef<string>('');
  const displayedTextRef = useRef<string>('');
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkCompleteIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const streamChat = useCallback(
    async (
      message: string,
      gameContext?: GameContext,
      gameId?: string | null,
      options?: StreamOptions,
    ): Promise<string> => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }

      abortControllerRef.current = new AbortController();
      setIsStreaming(true);
      setStreamedText('');
      textChunksRef.current = [];
      textBufferRef.current = '';
      displayedTextRef.current = '';

      let fullText = '';
      const typingDelay = options?.typingDelay ?? 35; // Default 35ms per character (~28 chars/sec)

      // Start typing effect interval
      typingIntervalRef.current = setInterval(() => {
        if (displayedTextRef.current.length < textBufferRef.current.length) {
          // Add next character(s) - 1 char at a time for smoother, slower feel
          const charsToAdd = Math.min(
            1, // Characters per tick
            textBufferRef.current.length - displayedTextRef.current.length,
          );
          const nextChars = textBufferRef.current.slice(
            displayedTextRef.current.length,
            displayedTextRef.current.length + charsToAdd,
          );
          displayedTextRef.current += nextChars;
          setStreamedText(displayedTextRef.current);
          options?.onChunk?.(nextChars);
        }
      }, typingDelay);

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            gameContext,
            gameId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Stream request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.done) {
                  // Stream complete - join chunks into final string
                  fullText = data.fullContent || textBufferRef.current;
                } else if (data.text) {
                  // Collect chunks in array, join once (avoids O(n²) string concat)
                  textChunksRef.current.push(data.text);
                  textBufferRef.current = textChunksRef.current.join('');
                  fullText = textBufferRef.current;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }

        // Wait for typing effect to finish displaying all buffered text
        await new Promise<void>((resolve) => {
          checkCompleteIntervalRef.current = setInterval(() => {
            if (displayedTextRef.current.length >= textBufferRef.current.length) {
              if (checkCompleteIntervalRef.current) {
                clearInterval(checkCompleteIntervalRef.current);
                checkCompleteIntervalRef.current = null;
              }
              resolve();
            }
          }, 50);
        });

        options?.onComplete?.(fullText);
        return fullText;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Stream was cancelled
          return displayedTextRef.current;
        }

        const err = error instanceof Error ? error : new Error('Unknown streaming error');
        options?.onError?.(err);
        throw err;
      } finally {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        if (checkCompleteIntervalRef.current) {
          clearInterval(checkCompleteIntervalRef.current);
          checkCompleteIntervalRef.current = null;
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [],
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  return {
    streamChat,
    cancelStream,
    isStreaming,
    streamedText,
  };
}

// Helper to check if streaming is supported
export function isStreamingSupported(): boolean {
  return typeof ReadableStream !== 'undefined' && typeof fetch !== 'undefined';
}
