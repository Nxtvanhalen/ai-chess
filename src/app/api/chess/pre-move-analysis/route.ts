import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai/client';
import { formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { MoveSuggestion } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { fen, moveHistory, gamePhase } = await request.json();
    
    if (!fen) {
      return NextResponse.json({ error: 'FEN is required' }, { status: 400 });
    }
    
    const context = formatMoveContext(fen);
    
    const systemPrompt = `You are Chester, Chris's chess buddy. 
    
    Give 1-2 casual move suggestions for Chris to consider. Keep it brief and friendly.
    
    Format your response as JSON:
    {
      "suggestions": [
        {
          "move": "Knight to F3",
          "reasoning": "Develops your piece and controls the center"
        }
      ],
      "casualComment": "Looking good so far!"
    }
    
    Rules:
    - Maximum 2 suggestions
    - Use simple move descriptions like "Knight to F3" not "Nf3"
    - Keep reasoning to one short sentence
    - Add a brief casual comment about the position
    - Be conversational, not instructional`;
    
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `${context}\n\nGame phase: ${gamePhase || 'opening'}\nRecent moves: ${moveHistory?.slice(-3).join(', ') || 'None yet'}\n\nWhat moves would you casually suggest to Chris?`
        }
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });
    
    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    const suggestions: MoveSuggestion[] = response.suggestions?.map((s: any) => ({
      move: s.move,
      reasoning: s.reasoning,
      casual: true
    })) || [];
    
    return NextResponse.json({
      suggestions: suggestions.slice(0, 2), // Ensure max 2 suggestions
      comment: response.casualComment || "Your turn!"
    });
    
  } catch (error) {
    console.error('Pre-move analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to generate move suggestions' },
      { status: 500 }
    );
  }
}