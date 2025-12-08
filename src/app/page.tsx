'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Move } from 'chess.js';
import ChessBoardLazy from '@/components/chess/ChessBoardLazy';
import ChatInterfaceLazy from '@/components/chat/ChatInterfaceLazy';
import GameLayout from '@/components/layout/GameLayout';
import { preloadCriticalLibraries } from '@/lib/utils/dynamicImports';
import { generateId, generateSimpleId } from '@/lib/utils/uuid';
import { ChatMessage, MoveSuggestion } from '@/types';
import { PerformanceMonitor, debounce } from '@/lib/utils/performance';
import { haptics } from '@/lib/utils/haptics';
import {
  createGame,
  updateGamePosition,
  saveMove,
  createConversation,
  saveMessage,
  getConversationMessages,
  getCurrentGame
} from '@/lib/supabase/database';
import { supabase } from '@/lib/supabase/client';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import { useChesterStream } from '@/hooks/useChesterStream';
import { BoardTheme, boardThemes, defaultTheme } from '@/lib/chess/boardThemes';
import ThemeSelector from '@/components/chess/ThemeSelector';
import ErrorBoundary from '@/components/utils/ErrorBoundary';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<string | undefined>();
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [gameOver, setGameOver] = useState<{ checkmate: boolean, winner?: 'white' | 'black' }>({ checkmate: false });
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(defaultTheme);
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const messagesRef = useRef<ChatMessage[]>([]);
  const performanceMonitor = useRef<PerformanceMonitor>(PerformanceMonitor.getInstance());
  const gameStartTimeRef = useRef<number>(Date.now());

  // Streaming Chester responses hook
  const { streamChat, isStreaming } = useChesterStream();

  // Typing effect helper for move commentary
  const typeText = useCallback((
    text: string,
    messageId: string,
    onComplete?: () => void
  ) => {
    let displayedLength = 0;
    const typingDelay = 35; // ms between characters (slower for readability)
    const charsPerTick = 1;

    const interval = setInterval(() => {
      displayedLength = Math.min(displayedLength + charsPerTick, text.length);
      const displayedText = text.slice(0, displayedLength);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: displayedText, metadata: { isThinking: false } }
            : msg
        )
      );

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

  // Initialize performance monitoring and preload libraries
  useEffect(() => {
    performanceMonitor.current = PerformanceMonitor.getInstance();
    performanceMonitor.current.startFPSMonitoring();

    // Preload critical libraries on user interaction
    preloadCriticalLibraries();

    // Log performance report every 30 seconds in development
    const reportInterval = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Performance Report:', performanceMonitor.current?.getReport());
      }
    }, 30000);

    return () => {
      performanceMonitor.current?.cleanup();
      clearInterval(reportInterval);
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
          await GameMemoryService.createGameMemory(newGame.id, 'chris');
          console.log('Game memory initialized for game:', newGame.id);
        } catch (error) {
          console.error('Error initializing game memory:', error);
        }

        // Create conversation for this game
        const conversation = await createConversation(newGame.id);
        setConversationId(conversation.id);

        // Add welcome message with typing effect
        const welcomeText = "Hey Chris! Ready for another game? I'll be here watching and giving you some tips. You're playing white against the engine. Good luck!";
        const welcomeId = await generateId();
        const welcomeMessage: ChatMessage = {
          id: welcomeId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          metadata: { isThinking: true }
        };

        setMessages([welcomeMessage]);

        // Start typing effect after brief delay
        setTimeout(() => {
          let displayedLength = 0;
          const typingDelay = 35;

          const interval = setInterval(() => {
            displayedLength = Math.min(displayedLength + 1, welcomeText.length);
            const displayedText = welcomeText.slice(0, displayedLength);

            setMessages(prev =>
              prev.map(msg =>
                msg.id === welcomeId
                  ? { ...msg, content: displayedText, metadata: { isThinking: false } }
                  : msg
              )
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
  }, []);

  // Get AI suggestions when it's user's turn
  const getAISuggestions = useCallback(async (fen: string, gameId?: string) => {
    if (!conversationId) return;

    try {
      // Create abort controller with 10 second timeout for slow API responses
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/chess/pre-move-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen,
          moveHistory: messagesRef.current.filter(m => m.metadata?.moveContext).map(m => m.metadata?.moveContext),
          gamePhase: detectGamePhase(fen),
          gameId: gameId || currentGameId,
          userId: 'chris',
          gameContext: {
            fen,
            totalMoves: messagesRef.current.filter(m => m.metadata?.moveContext).length
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const commentText = data.comment || "Your move!";
        const suggestionMessageId = generateSimpleId();

        // Add suggestion message with typing effect
        const suggestionMessage: ChatMessage = {
          id: suggestionMessageId,
          role: 'assistant',
          type: 'suggestion',
          content: '',
          timestamp: new Date(),
          metadata: {
            isThinking: true,
            suggestions: data.suggestions // Include suggestions from start so they render
          }
        };

        setMessages(prev => [...prev, suggestionMessage]);

        // Type out the comment
        typeText(commentText, suggestionMessageId);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  }, [conversationId, currentGameId, typeText]);

  const detectGamePhase = (fen: string) => {
    const moves = messagesRef.current.filter(m => m.metadata?.moveContext).length;
    if (moves < 10) return 'opening';
    if (moves < 30) return 'middlegame';
    return 'endgame';
  };

  const handleMove = useCallback(async (move: Move) => {
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
        'human'
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
        timestamp: new Date().toISOString()
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

      setMessages(prev => [...prev, moveMessage]);
      typeText(moveText, moveMessageId);
      await saveMessage(conversationId, 'user', moveText, moveMessage.metadata);

      setIsLoading(true);

      // Get AI commentary on the move
      const response = await fetch('/api/chess/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          move: move.san,
          fen: move.after,
          moveHistory: messages.filter(m => m.metadata?.moveContext),
          gameContext: {
            fen: move.after,
            totalMoves: newMoveCount,
            fullMoveHistory: messages.filter(m => m.metadata?.moveContext).map(m => ({
              role: m.role,
              move: m.metadata?.moveContext,
              position: m.metadata?.position
            }))
          },
          gameId: currentGameId,
          userId: 'chris',
          moveDetails: {
            san: move.san,
            from: move.from,
            to: move.to,
            piece: move.piece,
            captured: move.captured,
            player_type: 'human'
          }
        }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let aiResponse: ChatMessage = {
          id: generateSimpleId(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          metadata: { isThinking: true }
        };

        setMessages(prev => [...prev, aiResponse]);

        if (reader) {
          try {
            // Read all content first
            let fullContent = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              fullContent += chunk;
            }
            aiResponse.content = fullContent;

            // Use typing effect to display the content
            typeText(fullContent, aiResponse.id);
          } catch (streamError) {
            console.error('Stream reading error:', streamError);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === aiResponse.id
                  ? { ...msg, content: "I encountered an error. Please try again.", metadata: { isThinking: false } }
                  : msg
              )
            );
          }
        }

        // Save AI commentary to database
        await saveMessage(conversationId, 'assistant', aiResponse.content);

        // After AI commentary, get AI's move (only if it's AI's turn to play)
        // Check if it's black's turn (AI plays black)
        const isAiTurn = move.after.includes(' b '); // FEN notation: 'b' means black to move

        if (isAiTurn) {
          // Get player move history for engine adaptation
          const playerMoveHistory = messages.filter(m =>
            m.role === 'user' && m.metadata?.moveContext
          ).map(m => m.metadata?.moveContext || '').slice(-10);

          // First show engine move with thinking indicator
          const engineMoveMessage: ChatMessage = {
            id: generateSimpleId(),
            role: 'engine',
            type: 'move',
            content: '',
            timestamp: new Date(),
            metadata: {
              isThinking: true,
              analysis: 'Engine is thinking...'
            }
          };
          setMessages(prev => [...prev, engineMoveMessage]);

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
                newGame: moveCount === 0 // Signal new game on first move
              }),
            });

            if (aiMoveResponse.ok) {
              const aiMoveData = await aiMoveResponse.json();

              // Show realistic thinking process (or book move)
              const analysisText = aiMoveData.analysis?.fromBook
                ? aiMoveData.analysis.analysis // "Playing Sicilian Defense" etc.
                : aiMoveData.analysis?.analysis || 'Engine is thinking...';

              setMessages(prev => prev.map(msg =>
                msg.id === engineMoveMessage.id
                  ? { ...msg, metadata: { ...msg.metadata, analysis: analysisText, fromBook: aiMoveData.analysis?.fromBook } }
                  : msg
              ));

              // Wait for realistic thinking time
              const thinkingTime = aiMoveData.analysis?.thinkingTime || 1500;

              const aiMoveTimeout = setTimeout(async () => {
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
                    'ai'
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
                    timestamp: new Date().toISOString()
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
                        depth: aiMoveData.analysis?.depth || 2
                      }
                    }
                  };

                  setMessages(prev => prev.map(msg =>
                    msg.id === engineMoveMessage.id ? updatedEngineMessage : msg
                  ));

                  // Get Chester's analysis of the engine move
                  const analysisResponse = await fetch('/api/chess/engine-move-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      engineMove: aiMoveData,
                      fen: aiMoveData.fen,
                      engineEvaluation: aiMoveData.analysis?.evaluation || 0
                    })
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
                      metadata: { isThinking: true }
                    };

                    setMessages(prev => [...prev, analysisMessage]);

                    // Type out the analysis
                    typeText(analysisData.commentary, analysisMessageId, async () => {
                      await saveMessage(conversationId!, 'assistant', analysisData.commentary);
                    });
                  }

                  // If engine delivered checkmate, handle it and don't get suggestions
                  if (isEngineCheckmate) {
                    console.log('Engine delivered checkmate:', aiMoveData.san);
                    // Engine plays black, so black wins
                    handleCheckmate('black');
                  } else {
                    // After engine move, get suggestions for user's next move
                    setTimeout(() => {
                      getAISuggestions(aiMoveData.fen);
                    }, 1000);
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
      }
    } catch (error) {
      console.error('Error getting AI move commentary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [moveCount, currentGameId, conversationId, getAISuggestions, typeText]);

  const convertMoveToPlainEnglish = (san: string) => {
    // Convert algebraic notation to plain English
    const pieceMap: Record<string, string> = {
      'K': 'King',
      'Q': 'Queen',
      'R': 'Rook',
      'B': 'Bishop',
      'N': 'Knight',
      'O-O': 'castles kingside',
      'O-O-O': 'castles queenside'
    };

    // Handle castling
    if (san === 'O-O') return 'castles kingside';
    if (san === 'O-O-O') return 'castles queenside';

    // Handle regular moves
    const piece = san[0];
    if (pieceMap[piece]) {
      // Extract destination square
      const match = san.match(/[a-h][1-8]/);
      const destination = match ? match[0].toUpperCase() : '';
      return `${pieceMap[piece]} to ${destination}`;
    } else {
      // Pawn move
      const match = san.match(/[a-h][1-8]/);
      const destination = match ? match[0].toUpperCase() : '';
      return `Pawn to ${destination}`;
    }
  };

  const getRandomMoveComment = () => {
    const comments = [
      "Your turn!",
      "What you got?",
      "Over to you.",
      "Let's see what you do.",
      "Your move, buddy.",
      "Ball's in your court.",
      "Show me what you got.",
      "Interesting position now."
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateSimpleId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

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
      metadata: { isThinking: true }
    };

    setMessages(prev => [...prev, thinkingMessage]);

    try {
      // Use streaming for real-time Chester responses
      const gameContext = currentPosition ? {
        fen: currentPosition,
        lastMove: messages.slice(-5).find(m => m.metadata?.moveContext)?.metadata?.moveContext,
        totalMoves: messages.filter(m => m.metadata?.moveContext).length
      } : undefined;

      await streamChat(
        content,
        gameContext,
        currentGameId,
        {
          typingDelay: 20, // 20ms between characters for smooth typing effect
          onChunk: (chunk) => {
            // Update message content as characters are "typed"
            setMessages(prev =>
              prev.map(msg =>
                msg.id === thinkingMessageId
                  ? { ...msg, content: msg.content + chunk, metadata: { isThinking: false } }
                  : msg
              )
            );
          },
          onComplete: async (fullText) => {
            // Ensure final message shows complete text
            setMessages(prev =>
              prev.map(msg =>
                msg.id === thinkingMessageId
                  ? { ...msg, content: fullText, metadata: { isThinking: false } }
                  : msg
              )
            );
            // Save final response to database
            await saveMessage(conversationId, 'assistant', fullText);
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === thinkingMessageId
                  ? {
                    ...msg,
                    content: "I apologize, but I'm having trouble connecting. Please try again.",
                    metadata: { isThinking: false }
                  }
                  : msg
              )
            );
          }
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === thinkingMessageId
            ? {
              ...msg,
              content: "I apologize, but I'm having trouble connecting to my services. Please ensure the OpenAI API key is configured.",
              metadata: { isThinking: false }
            }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPosition, messages, conversationId, currentGameId, streamChat]);

  const handleCheckmate = useCallback(async (winner: 'white' | 'black') => {
    setGameOver({ checkmate: true, winner });

    // Finalize game in database
    if (currentGameId) {
      try {
        const durationSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
        const result = winner === 'white' ? 'white_wins' : 'black_wins';
        await GameMemoryService.finalizeGame(currentGameId, result, durationSeconds);
        console.log('Game finalized:', { result, durationSeconds, gameId: currentGameId });
      } catch (error) {
        console.error('Error finalizing game:', error);
      }
    }

    // Add checkmate message
    const checkmateMessage: ChatMessage = {
      id: generateSimpleId(),
      role: 'assistant',
      content: winner === 'white'
        ? "Checkmate! Well played, Chris. You've secured victory. Would you like to play again?"
        : "Checkmate! I've managed to secure the win this time. Good game, Chris! Ready for another?",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, checkmateMessage]);
  }, [currentGameId]);

  const handleRestart = useCallback(async () => {
    // Reset game state
    setGameOver({ checkmate: false });
    setMoveCount(0);
    gameStartTimeRef.current = Date.now();

    try {
      // Create new game
      const newGame = await createGame('white');
      setCurrentGameId(newGame.id);
      setCurrentPosition(newGame.fen);

      // Initialize game memory
      try {
        await GameMemoryService.createGameMemory(newGame.id, 'chris');
        console.log('Game memory initialized for restarted game:', newGame.id);
      } catch (error) {
        console.error('Error initializing game memory:', error);
      }

      // Create conversation for this game
      const conversation = await createConversation(newGame.id);
      setConversationId(conversation.id);

      // Add new game message - full text to avoid closure issues
      const newGameText = "New game! The board is reset and Chester's ready for another match. Your move, Chris!";
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
  }, []);

  return (
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
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Checkmate!
                  </h2>
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
          <ThemeSelector
            currentTheme={boardTheme}
            onThemeChange={setBoardTheme}
          />
        }
        chat={
          <ChatInterfaceLazy
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading || isStreaming}
          />
        }
      />
    </ErrorBoundary>
  );
}

