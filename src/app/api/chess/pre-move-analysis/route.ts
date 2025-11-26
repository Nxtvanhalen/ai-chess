import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai/client';
import { formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { PositionAnalyzer } from '@/lib/chess/positionAnalyzer';
import { MoveSuggestion } from '@/types';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import { ChesterMemoryService } from '@/lib/services/ChesterMemoryService';

export async function POST(request: NextRequest) {
  try {
    const { fen, moveHistory, gamePhase, gameId, userId = 'chris', gameContext } = await request.json();

    if (!fen) {
      return NextResponse.json({ error: 'FEN is required' }, { status: 400 });
    }

    console.log('Pre-move analysis - Starting:', {
      hasGameId: !!gameId,
      currentPhase: gamePhase,
      totalMoves: gameContext?.totalMoves
    });

    // Fetch comprehensive game memory context
    let fullGameContext = null;
    let chesterPersonality = null;

    if (gameId) {
      try {
        fullGameContext = await GameMemoryService.getGameContext(gameId);
        chesterPersonality = await ChesterMemoryService.getPersonalityContext(userId);

        console.log('Pre-move analysis - Memory loaded:', {
          totalMovesInMemory: fullGameContext?.totalMoves || 0,
          previousSuggestions: fullGameContext?.suggestionsGiven?.length || 0,
          tacticalThemes: fullGameContext?.tacticalThemes || []
        });
      } catch (error) {
        console.error('Error fetching game memory:', error);
        // Continue without memory - graceful degradation
      }
    }

    const context = formatMoveContext(fen);
    const analyzer = new PositionAnalyzer(fen);
    const analysis = analyzer.analyzePosition();
    
    // Create urgency-based system prompt
    let systemPrompt = `You are Chester, Chris's chess buddy watching him play. `;

    // Add personality and relationship context
    if (chesterPersonality) {
      systemPrompt += `\n\nYour relationship:
- Rapport Level: ${chesterPersonality.rapportLevel}/10
- Games Together: ${chesterPersonality.gamesPlayed}
- Recent Performance: ${chesterPersonality.recentPerformance}`;

      if (chesterPersonality.commonMistakes.length > 0) {
        systemPrompt += `\n- Watch for: ${chesterPersonality.commonMistakes.join(', ')}`;
      }
    }

    // Add comprehensive game context
    if (fullGameContext) {
      // Add tactical themes
      if (fullGameContext.tacticalThemes.length > 0) {
        systemPrompt += `\n\nTactical themes seen: ${fullGameContext.tacticalThemes.join(', ')}`;
      }

      // Add recent suggestions and their outcomes
      const recentSuggestions = fullGameContext.suggestionsGiven.slice(-3);
      if (recentSuggestions.length > 0) {
        systemPrompt += `\n\nYour recent suggestions:`;
        recentSuggestions.forEach(s => {
          const outcome = s.followed ? (s.outcome === 'good' ? '✓ Good!' : s.outcome === 'bad' ? '✗ Bad' : '~ Okay') : '(ignored)';
          systemPrompt += `\n- Move ${s.move_number}: ${s.suggestions.map(sg => sg.move).join(' or ')} ${outcome}`;
        });
        systemPrompt += `\n\nLearn from these outcomes when making new suggestions.`;
      }

      // Add full move history for better context
      if (fullGameContext.fullMoveHistory.length > 0) {
        const moveSequence = fullGameContext.fullMoveHistory
          .slice(-20) // Last 20 moves
          .map(m => `${m.move_number}. ${m.player_type === 'human' ? 'Chris' : 'AI'}: ${m.san}`)
          .join(', ');
        systemPrompt += `\n\nRecent moves: ${moveSequence}`;
      }
    }

    systemPrompt += `\n\n`;
    
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

    CRITICAL: You MUST respond with valid JSON in EXACTLY this format. Do not respond with anything other than JSON.

    Required JSON structure:
    {
      "suggestions": [
        {
          "move": "Knight to F3",
          "reasoning": "Develops piece"
        },
        {
          "move": "Pawn to E4",
          "reasoning": "Controls center"
        }
      ],
      "casualComment": "Choose wisely"
    }

    MANDATORY RULES:
    1. ALWAYS include the "suggestions" array (even if empty: [])
    2. ALWAYS include "casualComment" string
    3. Provide 1-2 move suggestions maximum
    4. Use simple descriptions: "Knight to F3" not "Nf3"
    5. Keep reasoning to 3-5 words
    6. casualComment must be brief and dry

    Example valid response:
    {"suggestions": [{"move": "Knight to F3", "reasoning": "Solid development"}], "casualComment": "Solid position"}

    DO NOT respond with empty JSON. ALWAYS provide at least one suggestion and a comment.`;
    
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${context}\n\nGame phase: ${gamePhase || 'opening'}\nRecent moves: ${moveHistory?.slice(-3).join(', ') || 'None yet'}\n\nWhat moves would you casually suggest to Chris?`
        }
      ],
      max_completion_tokens: 300,
      response_format: { type: 'json_object' }
    });
    
    const response = JSON.parse(completion.choices[0].message.content || '{}');

    console.log('Pre-move analysis raw response:', JSON.stringify(response, null, 2));

    const suggestions: MoveSuggestion[] = response.suggestions?.map((s: any) => ({
      move: s.move,
      reasoning: s.reasoning,
      casual: true
    })) || [];

    console.log('Pre-move analysis formatted suggestions:', JSON.stringify(suggestions, null, 2));

    const result = {
      suggestions: suggestions.slice(0, 2), // Ensure max 2 suggestions
      comment: response.casualComment || "Your turn!"
    };

    console.log('Pre-move analysis final result:', JSON.stringify(result, null, 2));

    // Save suggestions to game memory
    if (gameId && result.suggestions.length > 0) {
      try {
        const moveNumber = gameContext?.totalMoves || 1;

        await GameMemoryService.addSuggestions(gameId, {
          move_number: moveNumber,
          suggestions: result.suggestions,
          followed: false, // Will be updated when user makes move
          timestamp: new Date().toISOString()
        });

        // Also save as commentary
        await GameMemoryService.addCommentary(gameId, {
          move_number: moveNumber,
          type: 'suggestion',
          content: `Chester suggests: ${result.suggestions.map(s => s.move).join(' or ')}. ${result.comment}`,
          timestamp: new Date().toISOString(),
          metadata: {
            urgency_level: analysis.urgencyLevel
          }
        });

        console.log('Suggestions saved to game memory');
      } catch (error) {
        console.error('Error saving suggestions to game memory:', error);
        // Don't fail the request if memory save fails
      }
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Pre-move analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to generate move suggestions' },
      { status: 500 }
    );
  }
}