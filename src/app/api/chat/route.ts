import { NextRequest, NextResponse } from 'next/server';
import { createResponsesCompletion } from '@/lib/openai/client';
import { CHESS_BUTLER_SYSTEM_PROMPT, formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/middleware/rate-limit';
import { extractMoveSuggestions, validateMoveSuggestion } from '@/lib/chess/board-validator';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before sending another message.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }, 
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const { message, gameContext, moveHistory } = await request.json();
    
    // Debug: Log game context to help troubleshoot Chester's board visibility
    console.log('Chester Chat API - Game Context:', {
      hasGameContext: !!gameContext,
      fen: gameContext?.fen,
      lastMove: gameContext?.lastMove,
      totalMoves: gameContext?.totalMoves,
      messageLength: message.length
    });
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // Check if this is a playing style analysis question
    const styleAnalysisKeywords = [
      'playing style', 'my style', 'how am i playing', 'my gameplay', 'my approach',
      'my strategy', 'my tactics', 'my moves', 'analyze my play', 'my chess',
      'how do i play', 'my tendencies', 'my patterns', 'my strengths', 'my weaknesses'
    ];
    
    const isStyleAnalysis = styleAnalysisKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    // Build comprehensive instructions for Responses API
    let instructions = CHESS_BUTLER_SYSTEM_PROMPT;
    
    if (gameContext?.fen) {
      instructions += `\n\nCURRENT BOARD STATE - You CAN see the board clearly:\n${formatMoveContext(gameContext.fen, gameContext.lastMove)}`;
      
      if (gameContext.totalMoves) {
        instructions += `\n\nGame Progress: ${gameContext.totalMoves} moves have been played.`;
      }
    } else {
      instructions += `\n\nNote: No current board state available. Ask Chris to make a move if you need to see the position.`;
    }
    
    // Add move history for style analysis questions
    if (isStyleAnalysis && moveHistory && moveHistory.length > 0) {
      const recentMoves = moveHistory.slice(-50); // Last 50 moves
      const moveSequence = recentMoves
        .filter((m: any) => m.metadata?.moveContext)
        .map((m: any) => `${m.role === 'user' ? 'Chris' : 'AI'}: ${m.metadata.moveContext}`)
        .join(', ');
      
      if (moveSequence) {
        instructions += `\n\nRecent move history for style analysis (last ${recentMoves.length} moves): ${moveSequence}. 
        
        As Chester, analyze Chris's playing style based on these moves, looking for patterns in:
        - Opening preferences and development
        - Tactical vs positional approach  
        - Risk-taking vs cautious play
        - Piece coordination and planning
        - Endgame tendencies
        
        Provide specific, actionable insights about their chess style in your characteristic Chester voice.`;
      }
    }
    
    // Use GPT-5 Responses API with reasoning control for faster responses
    // No need for response chaining - GPT-5 handles turn-by-turn naturally
    const completion = await createResponsesCompletion({
      model: 'gpt-5.1',
      input: message,
      instructions: instructions,
      reasoning: {
        effort: 'low' // Fast responses for chat
      },
      max_output_tokens: 1000,
    });

    // Parse Responses API format
    const messageOutput = completion.output.find((item: any) => item.type === 'message');
    const textContent = messageOutput?.content.find((content: any) => content.type === 'output_text');
    let content = textContent?.text || 'Sorry, I encountered an issue.';
    
    // Validate move suggestions if a game context exists
    if (gameContext?.fen) {
      const moveSuggestions = extractMoveSuggestions(content);
      
      // Check each move suggestion and add corrections if needed
      for (const suggestion of moveSuggestions) {
        const validation = validateMoveSuggestion(gameContext.fen, suggestion);
        
        if (!validation.isValid) {
          // Log the error for debugging
          console.log(`Chester move validation error: ${suggestion} - ${validation.error}`);
          
          // If Chester made an error, append a correction note
          if (validation.correctedMove) {
            content += `\n\n[Note: ${validation.correctedMove}]`;
          }
        }
      }
    }
    
    // Return simple response - GPT-5 handles conversation naturally
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}