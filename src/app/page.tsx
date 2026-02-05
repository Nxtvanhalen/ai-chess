'use client';

import type { Move } from 'chess.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import LoginGate from '@/components/auth/LoginGate';
import ChatInterfaceLazy from '@/components/chat/ChatInterfaceLazy';
import ChessBoardLazy from '@/components/chess/ChessBoardLazy';
import ThemeSelector from '@/components/chess/ThemeSelector';
import GameLayout from '@/components/layout/GameLayout';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import UsageDisplay from '@/components/subscription/UsageDisplay';
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { useChesterStream } from '@/hooks/useChesterStream';
import { type BoardTheme, defaultTheme } from '@/lib/chess/boardThemes';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import {
  createConversation,
  createGame,
  saveMessage,
  saveMove,
  updateGamePosition,
} from '@/lib/supabase/database';
import { preloadCriticalLibraries } from '@/lib/utils/dynamicImports';
import { haptics } from '@/lib/utils/haptics';
import { PerformanceMonitor } from '@/lib/utils/performance';
import { generateId, generateSimpleId } from '@/lib/utils/uuid';
import type { ChatMessage } from '@/types';

export default function Home() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<string | undefined>();
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [gameOver, setGameOver] = useState<{ checkmate: boolean; winner?: 'white' | 'black' }>({
    checkmate: false,
  });
  const checkmateHandledRef = useRef(false);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(defaultTheme);
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    type: 'ai_move' | 'chat';
    resetAt?: string;
  }>({
    isOpen: false,
    type: 'ai_move',
  });
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const messagesRef = useRef<ChatMessage[]>([]);
  const performanceMonitor = useRef<PerformanceMonitor>(PerformanceMonitor.getInstance());
  const gameStartTimeRef = useRef<number>(Date.now());

  // Streaming Chester responses hook
  const { streamChat, isStreaming } = useChesterStream();

  // Typing effect helper for move commentary
  const typeText = useCallback((text: string, messageId: string, onComplete?: () => void) => {
    let displayedLength = 0;
    const typingDelay = 35; // ms between characters (slower for readability)
    const charsPerTick = 1;

    const interval = setInterval(() => {
      displayedLength = Math.min(displayedLength + charsPerTick, text.length);
      const displayedText = text.slice(0, displayedLength);

      setMessages((prev) => {
        let found = false;
        let changed = false;

        const next = prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          found = true;

          if (msg.content === displayedText && msg.metadata?.isThinking === false) {
            return msg;
          }

          changed = true;
          return { ...msg, content: displayedText, metadata: { isThinking: false } };
        });

        // If message disappeared (e.g. reset/new game), stop updating.
        if (!found) {
          clearInterval(interval);
          return prev;
        }

        return changed ? next : prev;
      });

      if (displayedLength >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, typingDelay);

    // Return cleanup function
    return () => clearInterval(interval);
  }, []);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Initialize and preload libraries
  useEffect(() => {
    // Preload critical libraries on user interaction
    preloadCriticalLibraries();

    // Only run FPS monitoring in development (it uses requestAnimationFrame constantly)
    if (process.env.NODE_ENV === 'development') {
      performanceMonitor.current = PerformanceMonitor.getInstance();
      performanceMonitor.current.startFPSMonitoring();
    }

    return () => {
      performanceMonitor.current?.cleanup();
    };
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current.clear();
    };
  }, []);

  // Initialize or restore game on mount
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Create new game
        const newGame = await createGame('white');
        setCurrentGameId(newGame.id);
        setCurrentPosition(newGame.fen);

        // Initialize game memory
        try {
          await GameMemoryService.createGameMemory(newGame.id, user?.id);
        } catch (error) {
          console.error('Error initializing game memory:', error);
        }

        // Create conversation for this game
        const conversation = await createConversation(newGame.id);
        setConversationId(conversation.id);

        // Add welcome message with typing effect
        const welcomeText =
          "Hello! Ready for another game? I'll be here watching and giving you some tips. You're playing white against the engine. Good luck!";
        const welcomeId = await generateId();
        const welcomeMessage: ChatMessage = {
          id: welcomeId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          metadata: { isThinking: true },
        };

        setMessages([welcomeMessage]);

        // Start typing effect after brief delay
        setTimeout(() => {
          let displayedLength = 0;
          const typingDelay = 35;

          const interval = setInterval(() => {
            displayedLength = Math.min(displayedLength + 1, welcomeText.length);
            const displayedText = welcomeText.slice(0, displayedLength);

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === welcomeId
                  ? { ...msg, content: displayedText, metadata: { isThinking: false } }
                  : msg,
              ),
            );

            if (displayedLength >= welcomeText.length) {
              clearInterval(interval);
            }
          }, typingDelay);
        }, 300);

        await saveMessage(conversation.id, 'assistant', welcomeText);
      } catch (error) {
        console.error('Error initializing game:', error);
      }
    };

    initializeGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const detectGamePhase = (_fen: string) => {
    const moves = messagesRef.current.filter((m) => m.metadata?.moveContext).length;
    if (moves < 10) return 'opening';
    if (moves < 30) return 'middlegame';
    return 'endgame';
  };


  const convertMoveToPlainEnglish = useCallback((san: string) => {
    // Convert algebraic notation to plain English
    const pieceMap: Record<string, string> = {
      K: 'King',
      Q: 'Queen',
      R: 'Rook',
      B: 'Bishop',
      N: 'Knight',
      'O-O': 'castles kingside',
      'O-O-O': 'castles queenside',
    };

    // Handle castling
    if (san === 'O-O') return 'castles kingside';
    if (san === 'O-O-O') return 'castles queenside';

    // Strip SAN suffix decorations so we can parse move intent.
    const cleaned = san.replace(/[+#?!]+$/g, '');
    const destinationMatch = cleaned.match(/[a-h][1-8]/);
    const destination = destinationMatch ? destinationMatch[0].toUpperCase() : '';
    const isCapture = cleaned.includes('x');
    const isCheckmate = san.includes('#');
    const isCheck = !isCheckmate && san.includes('+');

    // Handle regular moves
    const piece = cleaned[0];
    const pieceName = pieceMap[piece] || 'Pawn';
    let text = isCapture ? `${pieceName} takes on ${destination}` : `${pieceName} to ${destination}`;

    if (isCheckmate) text += ' (checkmate)';
    else if (isCheck) text += ' (check)';

    return text;
  }, []);

  const handleCheckmate = useCallback(
    async (winner: 'white' | 'black') => {
      // Guard against multiple calls (from both page.tsx and ChessBoard component)
      if (checkmateHandledRef.current) {
        return;
      }
      checkmateHandledRef.current = true;

      setGameOver({ checkmate: true, winner });

      // Finalize game in database
      if (currentGameId) {
        try {
          const durationSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
          const result = winner === 'white' ? 'white_wins' : 'black_wins';
          await GameMemoryService.finalizeGame(currentGameId, result, durationSeconds);
        } catch (error) {
          console.error('Error finalizing game:', error);
        }
      }

      // Add checkmate message
      const checkmateMessage: ChatMessage = {
        id: generateSimpleId(),
        role: 'assistant',
        content:
          winner === 'white'
            ? "Checkmate! Well played. You've secured victory. Want another?"
            : "Checkmate! I've managed to secure the win this time. Good game! Ready for another?",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, checkmateMessage]);
    },
    [currentGameId],
  );

  const handleMove = useCallback(
    async (move: Move) => {
      if (!currentGameId || !conversationId) return;

      // Haptic feedback for user move
      await haptics.moveMade();

      // Update position after move
      setCurrentPosition(move.after);
      const newMoveCount = moveCount + 1;
      setMoveCount(newMoveCount);

      try {
        // Save move to database
        await saveMove(
          currentGameId,
          Math.ceil(newMoveCount / 2),
          move.san,
          move.before,
          move.after,
          'human',
        );

        // Also save to game memory for Chester's recall
        await GameMemoryService.addMove(currentGameId, {
          move_number: newMoveCount,
          san: move.san,
          from: move.from,
          to: move.to,
          piece: move.piece,
          captured: move.captured,
          fen_after: move.after,
          player_type: 'human',
          timestamp: new Date().toISOString(),
        });

        // Update game position
        await updateGamePosition(currentGameId, move.after, '');

        // Add user move message with typing effect
        const moveMessageId = generateSimpleId();
        const moveText = `I played ${convertMoveToPlainEnglish(move.san)}`;
        const moveMessage: ChatMessage = {
          id: moveMessageId,
          role: 'user',
          content: '',
          timestamp: new Date(),
          metadata: {
            isThinking: true,
            moveContext: move.san,
            position: move.after,
          },
        };

        setMessages((prev) => [...prev, moveMessage]);
        typeText(moveText, moveMessageId);
        await saveMessage(conversationId, 'user', moveText, moveMessage.metadata);

        setIsLoading(true);

        // Check if user delivered checkmate (SAN notation ends with #)
        const isUserCheckmate = move.san?.includes('#');
        if (isUserCheckmate) {
          handleCheckmate('white');
          setIsLoading(false);
          return;
        }

        // After user move, get engine's move (only if it's AI's turn to play)
        // Check if it's black's turn (AI plays black)
        const isAiTurn = move.after.includes(' b '); // FEN notation: 'b' means black to move

        if (isAiTurn) {
          // Get player move history for engine adaptation
          const playerMoveHistory = messagesRef.current
            .filter((m) => m.role === 'user' && m.metadata?.moveContext)
            .map((m) => m.metadata?.moveContext || '')
            .slice(-10);

          // First show engine move with thinking indicator
          const engineMoveMessage: ChatMessage = {
            id: generateSimpleId(),
            role: 'engine',
            type: 'move',
            content: '',
            timestamp: new Date(),
            metadata: {
              isThinking: true,
              analysis: 'Engine is thinking...',
            },
          };
          setMessages((prev) => [...prev, engineMoveMessage]);

          // Get engine analysis first
          try {
            const aiMoveResponse = await fetch('/api/chess/ai-move', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fen: move.after,
                difficulty: 'medium',
                playerMoveHistory,
                newGame: moveCount === 0, // Signal new game on first move
              }),
            });

            // Handle usage limit exceeded
            if (aiMoveResponse.status === 429) {
              const errorData = await aiMoveResponse.json();
              if (errorData.code === 'USAGE_LIMIT_EXCEEDED') {
                setUpgradeModal({
                  isOpen: true,
                  type: 'ai_move',
                  resetAt: errorData.details?.resetAt,
                });
                // Remove the thinking message
                setMessages((prev) => prev.filter((msg) => msg.id !== engineMoveMessage.id));
                return;
              }
            }

            if (aiMoveResponse.ok) {
              const aiMoveData = await aiMoveResponse.json();

              // Show realistic thinking process (or book move)
              const analysisText = aiMoveData.analysis?.fromBook
                ? aiMoveData.analysis.analysis // "Playing Sicilian Defense" etc.
                : aiMoveData.analysis?.analysis || 'Engine is thinking...';

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === engineMoveMessage.id
                    ? {
                        ...msg,
                        metadata: {
                          ...msg.metadata,
                          analysis: analysisText,
                          fromBook: aiMoveData.analysis?.fromBook,
                        },
                      }
                    : msg,
                ),
              );

              // Wait for realistic thinking time
              const thinkingTime = aiMoveData.analysis?.thinkingTime || 1500;

              const aiMoveTimeout = setTimeout(async () => {
                // Bail out if checkmate was already handled (prevents duplicate processing)
                if (checkmateHandledRef.current) {
                  timeoutRefs.current.delete(aiMoveTimeout);
                  setIsLoading(false);
                  return;
                }

                try {
                  // Update the board with AI's move
                  setCurrentPosition(aiMoveData.fen);
                  const newAiMoveCount = moveCount + 2;
                  setMoveCount(newAiMoveCount);

                  // Check if engine delivered checkmate (SAN notation ends with #)
                  const isEngineCheckmate = aiMoveData.san?.includes('#');

                  // Save AI move to database (do this even for checkmate)
                  await saveMove(
                    currentGameId!,
                    Math.ceil(newAiMoveCount / 2),
                    aiMoveData.san,
                    move.after, // Previous position before AI move
                    aiMoveData.fen,
                    'ai',
                  );

                  // Also save to game memory for Chester's recall
                  await GameMemoryService.addMove(currentGameId!, {
                    move_number: newAiMoveCount,
                    san: aiMoveData.san,
                    from: aiMoveData.from || '',
                    to: aiMoveData.to || '',
                    piece: aiMoveData.piece || '',
                    captured: aiMoveData.captured,
                    fen_after: aiMoveData.fen,
                    player_type: 'ai',
                    timestamp: new Date().toISOString(),
                  });

                  // Update game position with AI move
                  await updateGamePosition(currentGameId!, aiMoveData.fen, '');

                  // Update engine move message with real analysis
                  const updatedEngineMessage: ChatMessage = {
                    ...engineMoveMessage,
                    content: convertMoveToPlainEnglish(aiMoveData.san),
                    metadata: {
                      isThinking: false,
                      moveContext: aiMoveData.san,
                      position: aiMoveData.fen,
                      engineAnalysis: {
                        move: aiMoveData.san,
                        evaluation: aiMoveData.analysis?.evaluation || 0,
                        depth: aiMoveData.analysis?.depth || 2,
                      },
                    },
                  };

                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === engineMoveMessage.id ? updatedEngineMessage : msg,
                    ),
                  );

                  // If engine delivered checkmate, handle it immediately and skip analysis
                  if (isEngineCheckmate) {
                    // Engine plays black, so black wins
                    handleCheckmate('black');
                    setIsLoading(false);
                    return;
                  }

                  // Only proceed with analysis if game is still ongoing
                  if (!checkmateHandledRef.current) {
                    // Get Chester's analysis of BOTH moves (user + engine) - skip on checkmate
                    const analysisResponse = await fetch('/api/chess/engine-move-analysis', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        engineMove: aiMoveData.san,
                        userMove: move.san,
                        fen: aiMoveData.fen,
                        engineEvaluation: aiMoveData.analysis?.evaluation || 0,
                      }),
                    });

                    if (analysisResponse.ok) {
                      const analysisData = await analysisResponse.json();

                      // Add Chester's commentary on engine move with typing effect
                      const analysisMessageId = generateSimpleId();
                      const analysisMessage: ChatMessage = {
                        id: analysisMessageId,
                        role: 'assistant',
                        type: 'analysis',
                        content: '',
                        timestamp: new Date(),
                        metadata: { isThinking: true },
                      };

                      setMessages((prev) => [...prev, analysisMessage]);

                      // Type out the analysis
                      typeText(analysisData.commentary, analysisMessageId, async () => {
                        await saveMessage(conversationId!, 'assistant', analysisData.commentary);
                      });
                    }
                  }
                } catch (moveError) {
                  console.error('Error processing AI move:', moveError);
                } finally {
                  timeoutRefs.current.delete(aiMoveTimeout);
                }
              }, thinkingTime);
              timeoutRefs.current.add(aiMoveTimeout);
            } else {
              console.error('Failed to get AI move');
            }
          } catch (error) {
            console.error('Error getting AI move:', error);
          }
        }
      } catch (error) {
        console.error('Error getting AI move commentary:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      moveCount,
      currentGameId,
      conversationId,
      typeText,
      convertMoveToPlainEnglish,
      handleCheckmate,
    ],
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: generateSimpleId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Save user message to database
      await saveMessage(conversationId, 'user', userMessage.content);

      setIsLoading(true);

      // Create thinking message for streaming
      const thinkingMessageId = generateSimpleId();
      const thinkingMessage: ChatMessage = {
        id: thinkingMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        metadata: { isThinking: true },
      };

      setMessages((prev) => [...prev, thinkingMessage]);

      try {
        // Use streaming for real-time Chester responses
        const gameContext = currentPosition
          ? {
              fen: currentPosition,
              lastMove: messages.slice(-5).find((m) => m.metadata?.moveContext)?.metadata
                ?.moveContext,
              totalMoves: messages.filter((m) => m.metadata?.moveContext).length,
            }
          : undefined;

        await streamChat(content, gameContext, currentGameId, {
          typingDelay: 20, // 20ms between characters for smooth typing effect
          onChunk: (chunk) => {
            // Update message content as characters are "typed"
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === thinkingMessageId
                  ? { ...msg, content: msg.content + chunk, metadata: { isThinking: false } }
                  : msg,
              ),
            );
          },
          onComplete: async (fullText) => {
            // Ensure final message shows complete text
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === thinkingMessageId
                  ? { ...msg, content: fullText, metadata: { isThinking: false } }
                  : msg,
              ),
            );
            // Save final response to database
            await saveMessage(conversationId, 'assistant', fullText);
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === thinkingMessageId
                  ? {
                      ...msg,
                      content: "I apologize, but I'm having trouble connecting. Please try again.",
                      metadata: { isThinking: false },
                    }
                  : msg,
              ),
            );
          },
        });
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingMessageId
              ? {
                  ...msg,
                  content:
                    "I apologize, but I'm having trouble connecting to my services. Please ensure the OpenAI API key is configured.",
                  metadata: { isThinking: false },
                }
              : msg,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentPosition, messages, conversationId, currentGameId, streamChat],
  );

  const handleRestart = useCallback(async () => {
    // Reset game state - set position FIRST to prevent ChessBoard from re-detecting checkmate
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setCurrentPosition(startingFen);
    setGameOver({ checkmate: false });
    setMoveCount(0);
    gameStartTimeRef.current = Date.now();

    // Only reset the ref AFTER position is updated to starting position
    checkmateHandledRef.current = false;

    try {
      // Create new game
      const newGame = await createGame('white');
      setCurrentGameId(newGame.id);
      // Position already set to starting FEN above

      // Initialize game memory
      try {
        await GameMemoryService.createGameMemory(newGame.id, user?.id);
      } catch (error) {
        console.error('Error initializing game memory:', error);
      }

      // Create conversation for this game
      const conversation = await createConversation(newGame.id);
      setConversationId(conversation.id);

      // Add new game message - full text to avoid closure issues
      const newGameText =
        "New game! The board is reset and Chester's ready for another match. Your move!";
      const newGameMessage: ChatMessage = {
        id: await generateId(),
        role: 'assistant',
        content: newGameText,
        timestamp: new Date(),
      };

      setMessages([newGameMessage]);
      await saveMessage(conversation.id, 'assistant', newGameText);
    } catch (error) {
      console.error('Error restarting game:', error);
    }
  }, [user?.id]);

  return (
    <LoginGate>
      <ErrorBoundary>
        <GameLayout
          chessBoard={
            <div className="relative h-full">
              <ChessBoardLazy
                onMove={handleMove}
                position={currentPosition}
                orientation="white"
                interactive={!gameOver.checkmate}
                onCheckmate={handleCheckmate}
                theme={boardTheme}
              />
              {gameOver.checkmate && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                  <div className="bg-gradient-to-br from-purple-900 to-blue-900 p-8 rounded-2xl shadow-2xl text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Checkmate!</h2>
                    <p className="text-xl text-gray-200 mb-6">
                      {gameOver.winner === 'white' ? 'White Wins!' : 'Black Wins!'}
                    </p>
                    <button
                      onClick={handleRestart}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                      Start New Game
                    </button>
                  </div>
                </div>
              )}
            </div>
          }
          controls={
            <div className="flex items-center gap-4 flex-wrap">
              <ThemeSelector currentTheme={boardTheme} onThemeChange={setBoardTheme} />
              <UsageDisplay />
            </div>
          }
          chat={
            <ChatInterfaceLazy
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading || isStreaming}
            />
          }
        />
        <UpgradeModal
          isOpen={upgradeModal.isOpen}
          onClose={() => setUpgradeModal((prev) => ({ ...prev, isOpen: false }))}
          type={upgradeModal.type}
          resetAt={upgradeModal.resetAt}
        />
      </ErrorBoundary>
    </LoginGate>
  );
}
