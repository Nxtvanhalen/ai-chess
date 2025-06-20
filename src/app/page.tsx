'use client';

import { useState, useCallback, useEffect } from 'react';
import { Move } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import ChessBoard from '@/components/chess/ChessBoard';
import ChatInterface from '@/components/chat/ChatInterface';
import GameLayout from '@/components/layout/GameLayout';
import { ChatMessage } from '@/types';
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
            id: uuidv4(),
            role: 'assistant',
            content: "Welcome back, Chris! I'm your Chess Butler, ready for our next game. I'll remember our entire journey together. Make your opening move when you're ready!",
            timestamp: new Date(),
          };
          
          setMessages([welcomeMessage]);
          await saveMessage(conversation.id, 'assistant', welcomeMessage.content);
        }
      } catch (error) {
        console.error('Error initializing game:', error);
      }
    };

    initializeGame();
  }, []);

  const handleMove = useCallback(async (move: Move) => {
    if (!currentGameId || !conversationId) return;
    
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
        id: uuidv4(),
        role: 'user',
        content: `I played ${move.san}`,
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
          moveHistory: messages.filter(m => m.metadata?.moveContext).slice(-10),
        }),
      });
      
      if (response.ok) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let aiResponse: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiResponse]);
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            
            // Add characters one by one with a slight delay for smooth typing effect
            for (const char of chunk) {
              aiResponse.content += char;
              
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === aiResponse.id 
                    ? { ...msg, content: aiResponse.content }
                    : msg
                )
              );
              
              // Add a small delay between characters for smooth typing effect
              await new Promise(resolve => setTimeout(resolve, 15));
            }
          }
        }
        
        // Save AI commentary to database
        await saveMessage(conversationId, 'assistant', aiResponse.content);
        
        // After AI commentary, get AI's move (if it's black's turn)
        setTimeout(async () => {
          try {
            const aiMoveResponse = await fetch('/api/chess/ai-move', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fen: move.after,
                difficulty: 'medium',
              }),
            });
            
            if (aiMoveResponse.ok) {
              const aiMoveData = await aiMoveResponse.json();
              
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
              
              // Add AI move message
              const aiMoveMessage: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: `I respond with ${aiMoveData.san}. ${getRandomMoveComment()}`,
                timestamp: new Date(),
                metadata: {
                  moveContext: aiMoveData.san,
                  position: aiMoveData.fen,
                },
              };
              
              setMessages(prev => [...prev, aiMoveMessage]);
              
              // Save AI move message to database
              await saveMessage(conversationId!, 'assistant', aiMoveMessage.content, aiMoveMessage.metadata);
            }
          } catch (error) {
            console.error('Error getting AI move:', error);
          }
        }, 2000); // Wait 2 seconds after commentary
      }
    } catch (error) {
      console.error('Error getting AI move commentary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, moveCount, currentGameId, conversationId]);

  const getRandomMoveComment = () => {
    const comments = [
      "Let's see how you handle this.",
      "Your move, Chris.",
      "I'm curious about your response.",
      "The position grows more interesting.",
      "What's your plan here?",
      "The game continues to evolve.",
      "I await your next strategic decision.",
      "Let's keep this engaging."
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
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
            lastMove: messages.filter(m => m.role === 'system').slice(-1)[0]?.metadata?.moveContext
          } : undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          
          // Add characters one by one with a slight delay for smooth typing effect
          for (const char of chunk) {
            assistantMessage.content += char;
            
            setMessages(prev => 
              prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: assistantMessage.content }
                  : msg
              )
            );
            
            // Add a small delay between characters for smooth typing effect
            await new Promise(resolve => setTimeout(resolve, 15));
          }
        }
      }
      
      // Save assistant response to database
      await saveMessage(conversationId, 'assistant', assistantMessage.content);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting to my services. Please ensure the OpenAI API key is configured.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPosition, messages, conversationId]);

  return (
    <GameLayout
      chessBoard={
        <ChessBoard
          onMove={handleMove}
          position={currentPosition}
          orientation="white"
          interactive={true}
        />
      }
      chat={
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      }
    />
  );
}
