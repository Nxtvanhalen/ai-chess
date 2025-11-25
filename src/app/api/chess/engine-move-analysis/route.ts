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
    
    The engine just made a move. React in ONE sentence. Be dry and witty.
    
    Examples:
    - "Called it."
    - "Machine's mad now."
    - "Predictable."
    - "That's aggressive."
    - "Setting a trap."
    - "Classic engine greed."
    - "It wants blood."
    - "Playing it safe, I see."
    
    Remember: Brief, observational, slightly sarcastic.`;
    
    const evaluationContext = engineEvaluation !== undefined 
      ? `\nEngine evaluation: ${engineEvaluation > 0 ? '+' : ''}${engineEvaluation.toFixed(2)}`
      : '';
    
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${context}${evaluationContext}\n\nThe engine just played: ${engineMove.san || engineMove}\n\nWhat's your casual take on this move?`
        }
      ],
      max_completion_tokens: 50, // One sentence
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