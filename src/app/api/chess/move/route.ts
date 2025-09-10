import { NextRequest, NextResponse } from 'next/server';
import { createResponsesCompletion } from '@/lib/openai/client';
import { CHESS_BUTLER_SYSTEM_PROMPT } from '@/lib/openai/chess-butler-prompt';
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/middleware/rate-limit';

const MOVE_ANALYSIS_PROMPT = `
You are Chester analyzing a move. Provide brief but insightful commentary on:
1. The strategic merit of the move
2. What it accomplishes tactically
3. Any potential concerns or better alternatives
4. Brief advice for the next phase

CRITICAL: Always spell out chess moves in plain English (e.g., "Knight to D3" instead of "Nd3", "Queen to E5" instead of "Qe5"). Never use algebraic notation when discussing moves.

Keep your response conversational, under 100 words, and maintain your dignified personality as Chester.
`;

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before requesting move analysis.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }, 
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const { move, fen, moveHistory, gameContext } = await request.json();
    
    if (!move || !fen) {
      return NextResponse.json({ error: 'Move and FEN are required' }, { status: 400 });
    }
    
    // Build context
    const messages: any[] = [
      { role: 'system', content: CHESS_BUTLER_SYSTEM_PROMPT },
      { role: 'system', content: MOVE_ANALYSIS_PROMPT },
      { role: 'system', content: `Current position (FEN): ${fen}` },
      { role: 'user', content: `I just played ${move}. What do you think of this move?` }
    ];
    
    // Add comprehensive game context
    if (gameContext?.fullMoveHistory && gameContext.fullMoveHistory.length > 0) {
      const moveSequence = gameContext.fullMoveHistory
        .map((m: any) => `${m.role === 'user' ? 'Chris' : 'AI'}: ${m.move}`)
        .join(', ');
      
      messages.splice(-1, 0, { 
        role: 'system', 
        content: `Complete game move history: ${moveSequence}
        
        Use this full context to provide accurate strategic analysis of Chris's move considering:
        - The opening progression and development patterns
        - Previous tactical sequences and their outcomes
        - The overall strategic direction of the game
        - How this move fits into the broader game plan` 
      });
    } else if (moveHistory && moveHistory.length > 0) {
      // Fallback to limited context if full history not available
      const recentMoves = moveHistory.map((m: any) => m.metadata?.moveContext).join(', ');
      messages.splice(-1, 0, { 
        role: 'system', 
        content: `Recent moves: ${recentMoves}` 
      });
    }
    
    // Build comprehensive instructions for Responses API
    let instructions = CHESS_BUTLER_SYSTEM_PROMPT + '\n\n' + MOVE_ANALYSIS_PROMPT;
    instructions += `\nCurrent position (FEN): ${fen}`;
    
    // Add comprehensive game context
    if (gameContext?.fullMoveHistory && gameContext.fullMoveHistory.length > 0) {
      const moveSequence = gameContext.fullMoveHistory
        .map((m: any) => `${m.role === 'user' ? 'Chris' : 'AI'}: ${m.move}`)
        .join(', ');
      
      instructions += `\n\nComplete game move history: ${moveSequence}
      
      Use this full context to provide accurate strategic analysis of Chris's move considering:
      - The opening progression and development patterns
      - Previous tactical sequences and their outcomes
      - The overall strategic direction of the game
      - How this move fits into the broader game plan`;
    } else if (moveHistory && moveHistory.length > 0) {
      // Fallback to limited context if full history not available
      const recentMoves = moveHistory.map((m: any) => m.metadata?.moveContext).join(', ');
      instructions += `\n\nRecent moves: ${recentMoves}`;
    }

    const completion = await createResponsesCompletion({
      model: 'gpt-5',
      input: `I just played ${move}. React briefly.`,
      instructions: instructions + `\n\nREMEMBER: Keep your reaction to 1 sentence, maybe 2 if critical. Be witty, not eager. Examples: "Solid.", "That's brave.", "Engine won't like that.", "Interesting choice.", "Trading queens already?"`,
      reasoning: {
        effort: 'minimal' // Fast move analysis
      },
      max_output_tokens: 100, // Reduced for brevity
    });
    
    // Parse Responses API format
    const messageOutput = completion.output.find((item: any) => item.type === 'message');
    const textContent = messageOutput?.content.find((content: any) => content.type === 'output_text');
    const content = textContent?.text || 'Sorry, I encountered an issue analyzing your move.';
    
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Move analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze move' },
      { status: 500 }
    );
  }
}