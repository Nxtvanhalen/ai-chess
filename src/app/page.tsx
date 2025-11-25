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

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<string | undefined>();
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [gameOver, setGameOver] = useState<{checkmate: boolean, winner?: 'white' | 'black'}>({checkmate: false});
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const messagesRef = useRef<ChatMessage[]>([]);
  const performanceMonitor = useRef<PerformanceMonitor>(PerformanceMonitor.getInstance());
  
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
        // Always create a new game for now (to avoid loading old data)
        // const existingGame = await getCurrentGame();
        
        // Create new game instead of restoring existing
        {
          // Create new game
          const newGame = await createGame('white');
          setCurrentGameId(newGame.id);
          setCurrentPosition(newGame.fen);
          
          // Create conversation for this game
          const conversation = await createConversation(newGame.id);
          setConversationId(conversation.id);
          
          // Add welcome message
          const welcomeMessage: ChatMessage = {
            id: await generateId(),
            role: 'assistant',
            content: "Hey Chris! Ready for another game? I'll be here watching and giving you some tips. You're playing white against the engine. Good luck!",
            timestamp: new Date(),
          };
          
          setMessages([welcomeMessage]);
          await saveMessage(conversation.id, 'assistant', welcomeMessage.content);
          
          // Get initial suggestions
          setTimeout(() => {
            getAISuggestions(newGame.fen);
          }, 500);
        }
      } catch (error) {
        console.error('Error initializing game:', error);
      }
    };

    initializeGame();
  }, []);

  // Get AI suggestions when it's user's turn
  const getAISuggestions = useCallback(async (fen: string) => {
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
          gamePhase: detectGamePhase(fen)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Add suggestion message
        const suggestionMessage: ChatMessage = {
          id: generateSimpleId(),
          role: 'assistant',
          type: 'suggestion',
          content: data.comment || "Your move!",
          timestamp: new Date(),
          metadata: {
            suggestions: data.suggestions
          }
        };
        
        setMessages(prev => [...prev, suggestionMessage]);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  }, [conversationId]);
  
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
      
      // Update game position  
      await updateGamePosition(currentGameId, move.after, '');
      
      // Add user move message
      const moveMessage: ChatMessage = {
        id: generateSimpleId(),
        role: 'user',
        content: `I played ${convertMoveToPlainEnglish(move.san)}`,
        timestamp: new Date(),
        metadata: {
          moveContext: move.san,
          position: move.after,
        },
      };
      
      setMessages(prev => [...prev, moveMessage]);
      await saveMessage(conversationId, 'user', moveMessage.content, moveMessage.metadata);
      
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
            fullMoveHistory: messages.filter(m => m.metadata?.moveContext).map(m => ({
              role: m.role,
              move: m.metadata?.moveContext,
              position: m.metadata?.position
            }))
          },
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
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              aiResponse.content += chunk;
            }
            
            // Add small delay before showing content to allow fade-in animation
            const fadeTimeout = setTimeout(() => {
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === aiResponse.id 
                    ? { ...msg, content: aiResponse.content, metadata: { isThinking: false } }
                    : msg
                )
              );
              timeoutRefs.current.delete(fadeTimeout);
            }, 300);
            timeoutRefs.current.add(fadeTimeout);
          } catch (streamError) {
            console.error('Stream reading error:', streamError);
            aiResponse.content = "I encountered an error while generating my response. Please try again.";
            setMessages(prev => 
              prev.map(msg => 
                msg.id === aiResponse.id 
                  ? { ...msg, content: aiResponse.content, metadata: { isThinking: false } }
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
                playerMoveHistory
              }),
            });
          
            if (aiMoveResponse.ok) {
              const aiMoveData = await aiMoveResponse.json();
              
              // Show realistic thinking process
              if (aiMoveData.analysis?.analysis) {
                setMessages(prev => prev.map(msg => 
                  msg.id === engineMoveMessage.id 
                    ? { ...msg, metadata: { ...msg.metadata, analysis: aiMoveData.analysis.analysis } }
                    : msg
                ));
              }
              
              // Wait for realistic thinking time
              const thinkingTime = aiMoveData.analysis?.thinkingTime || 1500;
              
              const aiMoveTimeout = setTimeout(async () => {
                try {
                  // Update the board with AI's move
                  setCurrentPosition(aiMoveData.fen);
                  const newAiMoveCount = moveCount + 2;
                  setMoveCount(newAiMoveCount);
                  
                  // Save AI move to database
                  await saveMove(
                    currentGameId!,
                    Math.ceil(newAiMoveCount / 2),
                    aiMoveData.san,
                    move.after, // Previous position before AI move
                    aiMoveData.fen,
                    'ai'
                  );
                  
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
                    
                    // Add Chester's commentary on engine move
                    const analysisMessage: ChatMessage = {
                      id: generateSimpleId(),
                      role: 'assistant',
                      type: 'analysis',
                      content: analysisData.commentary,
                      timestamp: new Date()
                    };
                    
                    setMessages(prev => [...prev, analysisMessage]);
                    await saveMessage(conversationId!, 'assistant', analysisMessage.content);
                  }
                  
                  // After engine move, get suggestions for user's next move
                  setTimeout(() => {
                    getAISuggestions(aiMoveData.fen);
                  }, 1000);
                  
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
  }, [moveCount, currentGameId, conversationId, getAISuggestions]);

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
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          gameContext: currentPosition ? {
            fen: currentPosition,
            lastMove: messages.slice(-5).find(m => m.metadata?.moveContext)?.metadata?.moveContext,
            totalMoves: messages.filter(m => m.metadata?.moveContext).length
          } : undefined,
          moveHistory: messages,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Show thinking indicator immediately
      const thinkingMessage: ChatMessage = {
        id: generateSimpleId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        metadata: { isThinking: true }
      };
      
      setMessages(prev => [...prev, thinkingMessage]);
      
      // Handle non-streaming response (GPT-5 without verification)
      const responseText = await response.text();
      
      // Replace thinking message with actual response
      const assistantMessage: ChatMessage = {
        id: thinkingMessage.id,
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        metadata: { isThinking: false }
      };
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === thinkingMessage.id 
            ? assistantMessage
            : msg
        )
      );
      
      // Save assistant response to database
      await saveMessage(conversationId, 'assistant', assistantMessage.content);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: generateSimpleId(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting to my services. Please ensure the OpenAI API key is configured.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPosition, messages, conversationId]);

  const handleCheckmate = useCallback((winner: 'white' | 'black') => {
    setGameOver({ checkmate: true, winner });
    
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
  }, []);

  const handleRestart = useCallback(async () => {
    // Reset game state
    setGameOver({ checkmate: false });
    setMoveCount(0);
    
    try {
      // Create new game
      const newGame = await createGame('white');
      setCurrentGameId(newGame.id);
      setCurrentPosition(newGame.fen);
      
      // Create conversation for this game
      const conversation = await createConversation(newGame.id);
      setConversationId(conversation.id);
      
      // Add new game message
      const newGameMessage: ChatMessage = {
        id: await generateId(),
        role: 'assistant',
        content: "New game! The board is reset and Chester's ready for another match. Your move, Chris!",
        timestamp: new Date(),
      };
      
      setMessages([newGameMessage]);
      await saveMessage(conversation.id, 'assistant', newGameMessage.content);
    } catch (error) {
      console.error('Error restarting game:', error);
    }
  }, []);

  return (
    <GameLayout
      chessBoard={
        <div className="relative h-full">
          <ChessBoardLazy
            onMove={handleMove}
            position={currentPosition}
            orientation="white"
            interactive={!gameOver.checkmate}
            onCheckmate={handleCheckmate}
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
      chat={
        <ChatInterfaceLazy
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      }
    />
  );
}
