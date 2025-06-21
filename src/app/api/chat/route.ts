import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai/client';
import { CHESS_BUTLER_SYSTEM_PROMPT, formatMoveContext } from '@/lib/openai/chess-butler-prompt';

export async function POST(request: NextRequest) {
  try {
    const { message, gameContext, moveHistory } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const openai = getOpenAIClient();
    
    // Check if this is a playing style analysis question
    const styleAnalysisKeywords = [
      'playing style', 'my style', 'how am i playing', 'my gameplay', 'my approach',
      'my strategy', 'my tactics', 'my moves', 'analyze my play', 'my chess',
      'how do i play', 'my tendencies', 'my patterns', 'my strengths', 'my weaknesses'
    ];
    
    const isStyleAnalysis = styleAnalysisKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    // Build context message if game state is provided
    const messages: any[] = [
      { role: 'system', content: CHESS_BUTLER_SYSTEM_PROMPT }
    ];
    
    if (gameContext?.fen) {
      messages.push({
        role: 'system',
        content: formatMoveContext(gameContext.fen, gameContext.lastMove)
      });
    }
    
    // Add move history for style analysis questions
    if (isStyleAnalysis && moveHistory && moveHistory.length > 0) {
      const recentMoves = moveHistory.slice(-50); // Last 50 moves
      const moveSequence = recentMoves
        .filter((m: any) => m.metadata?.moveContext)
        .map((m: any) => `${m.role === 'user' ? 'Chris' : 'AI'}: ${m.metadata.moveContext}`)
        .join(', ');
      
      if (moveSequence) {
        messages.push({
          role: 'system',
          content: `Recent move history for style analysis (last ${recentMoves.length} moves): ${moveSequence}. 
          
          As Chester, analyze Chris's playing style based on these moves, looking for patterns in:
          - Opening preferences and development
          - Tactical vs positional approach  
          - Risk-taking vs cautious play
          - Piece coordination and planning
          - Endgame tendencies
          
          Provide specific, actionable insights about their chess style in your characteristic Chester voice.`
        });
      }
    }
    
    messages.push({ role: 'user', content: message });
    
    // Use GPT-4o for the response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });
    
    // Create a streaming response
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