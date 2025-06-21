import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai/client';
import { CHESS_BUTLER_SYSTEM_PROMPT } from '@/lib/openai/chess-butler-prompt';

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
    const { move, fen, moveHistory, gameContext } = await request.json();
    
    if (!move || !fen) {
      return NextResponse.json({ error: 'Move and FEN are required' }, { status: 400 });
    }
    
    const openai = getOpenAIClient();
    
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
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 200,
      stream: true,
    });
    
    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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