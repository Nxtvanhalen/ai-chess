import { NextRequest, NextResponse } from 'next/server';
import { createResponsesCompletion } from '@/lib/openai/client';
import { CHESS_BUTLER_SYSTEM_PROMPT } from '@/lib/openai/chess-butler-prompt';
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/middleware/rate-limit';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import { ChesterMemoryService } from '@/lib/services/ChesterMemoryService';

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

    const { move, fen, moveHistory, gameContext, gameId, userId = 'chris', moveDetails } = await request.json();

    if (!move || !fen) {
      return NextResponse.json({ error: 'Move and FEN are required' }, { status: 400 });
    }

    console.log('Move API - Processing move:', {
      move,
      hasGameId: !!gameId,
      hasMoveDetails: !!moveDetails,
      totalMoves: gameContext?.totalMoves
    });

    // Fetch comprehensive game memory context
    let fullGameContext = null;
    let chesterPersonality = null;

    if (gameId) {
      try {
        fullGameContext = await GameMemoryService.getGameContext(gameId);
        chesterPersonality = await ChesterMemoryService.getPersonalityContext(userId);

        console.log('Move API - Memory context loaded:', {
          totalMovesInMemory: fullGameContext?.totalMoves || 0,
          tacticalThemes: fullGameContext?.tacticalThemes || []
        });
      } catch (error) {
        console.error('Error fetching game memory:', error);
        // Continue without memory - graceful degradation
      }
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

    // Add Chester's personality context
    if (chesterPersonality) {
      instructions += `\n\nYour relationship with Chris:
- Rapport Level: ${chesterPersonality.rapportLevel}/10
- Games Together: ${chesterPersonality.gamesPlayed}
- Recent Performance: ${chesterPersonality.recentPerformance}`;
    }

    // Add comprehensive game memory context
    if (fullGameContext && fullGameContext.fullMoveHistory.length > 0) {
      const moveSequence = fullGameContext.fullMoveHistory
        .map((m: any) => `${m.move_number}. ${m.player_type === 'human' ? 'Chris' : 'AI'}: ${m.san}${m.captured ? ' (x' + m.captured + ')' : ''}`)
        .join(', ');

      instructions += `\n\nComplete game move history: ${moveSequence}`;

      // Add tactical themes
      if (fullGameContext.tacticalThemes.length > 0) {
        instructions += `\nTactical themes so far: ${fullGameContext.tacticalThemes.join(', ')}`;
      }

      // Add recent commentary for context
      const recentCommentary = fullGameContext.chesterCommentary.slice(-3);
      if (recentCommentary.length > 0) {
        instructions += `\nYour recent commentary:`;
        recentCommentary.forEach(c => {
          instructions += `\n- Move ${c.move_number}: ${c.content}`;
        });
      }

      instructions += `\n\nUse this full context to provide accurate strategic analysis considering:
      - The opening progression and development patterns
      - Previous tactical sequences and their outcomes
      - The overall strategic direction of the game
      - How this move fits into the broader game plan
      - Patterns you've previously noticed`;
    } else if (gameContext?.fullMoveHistory && gameContext.fullMoveHistory.length > 0) {
      // Fallback to gameContext if game memory not available
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
      model: 'gpt-5.1',
      input: `I just played ${move}. React briefly.`,
      instructions: instructions + `\n\nREMEMBER: Keep your reaction to 1 sentence, maybe 2 if critical. Be witty, not eager. Examples: "Solid.", "That's brave.", "Engine won't like that.", "Interesting choice.", "Trading queens already?"`,
      reasoning: {
        effort: 'low' // Fast move analysis
      },
      max_output_tokens: 100, // Reduced for brevity
    });
    
    // Parse Responses API format
    const messageOutput = completion.output.find((item: any) => item.type === 'message');
    const textContent = messageOutput?.content.find((content: any) => content.type === 'output_text');
    const content = textContent?.text || 'Sorry, I encountered an issue analyzing your move.';

    // Save move and commentary to game memory
    if (gameId && moveDetails) {
      try {
        const moveNumber = gameContext?.totalMoves || 1;

        // Save the move to game memory
        await GameMemoryService.addMove(gameId, {
          move_number: moveNumber,
          san: moveDetails.san || move,
          from: moveDetails.from || '',
          to: moveDetails.to || '',
          piece: moveDetails.piece || '',
          captured: moveDetails.captured,
          fen_after: fen,
          timestamp: new Date().toISOString(),
          player_type: moveDetails.player_type || 'human',
          evaluation: moveDetails.evaluation
        });

        // Save Chester's commentary
        await GameMemoryService.addCommentary(gameId, {
          move_number: moveNumber,
          type: 'post_move',
          content: content,
          timestamp: new Date().toISOString(),
          metadata: {}
        });

        // Detect and save tactical themes from commentary
        const tacticalKeywords = {
          'fork': 'fork',
          'pin': 'pin',
          'skewer': 'skewer',
          'discovery': 'discovered_attack',
          'sacrifice': 'sacrifice',
          'mate threat': 'mate_threat',
          'zugzwang': 'zugzwang',
          'overload': 'overload',
          'deflection': 'deflection',
          'decoy': 'decoy'
        };

        const lowercaseContent = content.toLowerCase();
        for (const [keyword, theme] of Object.entries(tacticalKeywords)) {
          if (lowercaseContent.includes(keyword)) {
            await GameMemoryService.addTacticalTheme(gameId, theme);
          }
        }

        console.log('Move and commentary saved to game memory');
      } catch (error) {
        console.error('Error saving to game memory:', error);
        // Don't fail the request if memory save fails
      }
    }

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