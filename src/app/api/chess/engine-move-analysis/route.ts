import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai/client';
import { formatMoveContext } from '@/lib/openai/chess-butler-prompt';

export async function POST(request: NextRequest) {
  try {
    const { engineMove, fen, engineEvaluation, alternatives } = await request.json();
    
    if (!engineMove || !fen) {
      return NextResponse.json(
        { error: 'Engine move and FEN are required' }, 
        { status: 400 }
      );
    }
    
    const context = formatMoveContext(fen, engineMove.san || engineMove);
    
    const systemPrompt = `You are Chester, Chris's chess buddy watching him play against a chess engine.
    
    The engine just made a move. Give a brief, casual reaction to the engine's move.
    
    Keep it to 1-2 sentences max. Be conversational and natural. Examples:
    - "The engine's going aggressive with that one."
    - "Didn't see that coming. Typical computer move."
    - "It's setting something up here."
    - "That's a solid defensive move."
    - "The engine likes its knights, apparently."
    
    Mix it up - sometimes comment on:
    - The engine's style ("Playing it safe" or "Going for complications")
    - The position ("Things are getting interesting")
    - What the engine might be planning
    - How it compares to human play ("Classic engine precision")
    
    Remember: You're Chris's friend watching the game with him, not analyzing deeply.`;
    
    const evaluationContext = engineEvaluation !== undefined 
      ? `\nEngine evaluation: ${engineEvaluation > 0 ? '+' : ''}${engineEvaluation.toFixed(2)}`
      : '';
    
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `${context}${evaluationContext}\n\nThe engine just played: ${engineMove.san || engineMove}\n\nWhat's your casual take on this move?`
        }
      ],
      temperature: 0.9,
      max_tokens: 100,
    });
    
    const commentary = completion.choices[0].message.content || "Interesting move by the engine.";
    
    return NextResponse.json({
      commentary,
      analysis: {
        move: engineMove.san || engineMove,
        evaluation: engineEvaluation || 0,
        depth: 10, // You could get this from the engine
      }
    });
    
  } catch (error) {
    console.error('Engine move analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze engine move' },
      { status: 500 }
    );
  }
}