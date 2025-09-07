import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai/client';
import { formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { PositionAnalyzer } from '@/lib/chess/positionAnalyzer';
import { MoveSuggestion } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { fen, moveHistory, gamePhase } = await request.json();
    
    if (!fen) {
      return NextResponse.json({ error: 'FEN is required' }, { status: 400 });
    }
    
    const context = formatMoveContext(fen);
    const analyzer = new PositionAnalyzer(fen);
    const analysis = analyzer.analyzePosition();
    
    // Create urgency-based system prompt
    let systemPrompt = `You are Chester, Chris's chess buddy watching him play. `;
    
    if (analysis.urgencyLevel === 'emergency') {
      systemPrompt += `URGENT SITUATION! Chris needs immediate help. Focus on:
      - Saving hanging pieces or capturing enemy hanging pieces
      - Getting out of check or preventing checkmate
      - Critical tactical moves only
      
      Be direct but supportive: "Dude, save that Knight!" or "Grab that hanging Queen!"`;
      
    } else if (analysis.urgencyLevel === 'tactical') {
      systemPrompt += `Tactical situation - Chris has some threats to handle or opportunities to seize. Focus on:
      - Material gains/losses
      - Piece safety
      - Simple tactical shots
      
      Be encouraging: "Nice spot - go for it!" or "Watch out for that attack"`;
      
    } else {
      systemPrompt += `Good position for strategic thinking. Focus on:
      - Piece development and improvement  
      - King safety (castling)
      - Central control
      - Positional advantages
      
      Stay casual and friendly: "How about..." or "Maybe try..."`;
    }
    
    systemPrompt += `
    
    Format your response as JSON:
    {
      "suggestions": [
        {
          "move": "Knight to F3", 
          "reasoning": "Develops your piece and controls center"
        }
      ],
      "casualComment": "Looking good!"
    }
    
    Rules:
    - Maximum 2 suggestions, prioritize by urgency
    - Use simple descriptions: "Knight to F3" not "Nf3"
    - Keep reasoning to one short sentence
    - Match your tone to the situation urgency
    - Be Chris's helpful chess buddy, not a teacher`;
    
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