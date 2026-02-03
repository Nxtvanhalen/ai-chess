import { type NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getUser';
import { PositionAnalyzer } from '@/lib/chess/positionAnalyzer';
import { formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { getOpenAIClient } from '@/lib/openai/client';
import { checkRateLimitRedis, getClientIPFromRequest, getRateLimitHeadersRedis } from '@/lib/redis';
import { ChesterMemoryService } from '@/lib/services/ChesterMemoryService';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import { preMoveAnalysisSchema, validateRequest } from '@/lib/validation/schemas';
import type { MoveSuggestion } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit (Redis-based, falls back to in-memory)
    const clientIP = getClientIPFromRequest(request);
    const rateLimitResult = await checkRateLimitRedis(clientIP, 'preMoveAnalysis');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait before requesting analysis.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: getRateLimitHeadersRedis(rateLimitResult),
        },
      );
    }

    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateRequest(preMoveAnalysisSchema, body);
    if (!validation.success) {
      console.error('Pre-move analysis - Validation failed:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { fen, moveHistory, gamePhase, gameId, gameContext } = validation.data;

    // Get authenticated user, fall back to null for unauthenticated requests
    const authUser = await getAuthenticatedUser();
    const userId = authUser?.id || null;


    // Fetch comprehensive game memory context (parallelized for performance)
    let fullGameContext = null;
    let chesterPersonality = null;

    if (gameId) {
      try {
        // Run both fetches in parallel - saves ~100ms per request
        [fullGameContext, chesterPersonality] = await Promise.all([
          GameMemoryService.getGameContext(gameId),
          ChesterMemoryService.getPersonalityContext(userId),
        ]);
      } catch (error) {
        console.error('Error fetching game memory:', error);
        // Continue without memory - graceful degradation
      }
    }

    const context = formatMoveContext(fen);
    const analyzer = new PositionAnalyzer(fen);
    const analysis = analyzer.analyzePosition();

    // Create urgency-based system prompt
    let systemPrompt = `You are Chester, a chess buddy watching the game. `;

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
        recentSuggestions.forEach((s) => {
          const outcome = s.followed
            ? s.outcome === 'good'
              ? '✓ Good!'
              : s.outcome === 'bad'
                ? '✗ Bad'
                : '~ Okay'
            : '(ignored)';
          systemPrompt += `\n- Move ${s.move_number}: ${s.suggestions.map((sg) => sg.move).join(' or ')} ${outcome}`;
        });
        systemPrompt += `\n\nLearn from these outcomes when making new suggestions.`;
      }

      // Add full move history for better context
      if (fullGameContext.fullMoveHistory.length > 0) {
        const moveSequence = fullGameContext.fullMoveHistory
          .slice(-20) // Last 20 moves
          .map((m) => `${m.move_number}. ${m.player_type === 'human' ? 'Player' : 'AI'}: ${m.san}`)
          .join(', ');
        systemPrompt += `\n\nRecent moves: ${moveSequence}`;
      }
    }

    systemPrompt += `\n\n`;

    if (analysis.urgencyLevel === 'emergency') {
      systemPrompt += `URGENT! Focus on the critical issue:
      - If in check: get out of check
      - If piece hanging worth 3+: save it or trade favorably
      - If can capture high-value piece: take it

      Be direct: "Dude, save that Knight!" or "Grab that free piece!"`;
    } else if (analysis.urgencyLevel === 'tactical') {
      systemPrompt += `There might be tactics here, but DON'T obsess over saving pawns. Prioritize:
      - Active piece play over passive defense
      - Creating threats over reacting to minor threats
      - Central control and piece activity
      - Only mention pawn saves if it's actually significant (like a passed pawn)

      Be proactive: "Create some chaos!" or "Let's put pressure on"`;
    } else {
      // Strategic - most common case, needs variety
      const strategicIdeas = [
        'Piece activity - get your pieces to better squares',
        'Create a plan - attack on kingside? Queenside? Central breakthrough?',
        'Improve your worst piece - which piece is doing nothing?',
        'Control key squares and files',
        'Prepare a pawn break to open lines',
        'Coordinate your pieces for an attack',
        'Prophylaxis - what does your opponent want? Stop it.',
      ];
      const randomIdea = strategicIdeas[Math.floor(Math.random() * strategicIdeas.length)];

      systemPrompt += `Calm position - think strategically. Today's focus: ${randomIdea}

      AVOID suggesting:
      - Saving pawns unless they're truly important (passed pawns, protecting key squares)
      - Repetitive defensive moves
      - The same type of move you've suggested recently

      Think like a coach: "What's the plan here?" "Where should pieces go?"`;
    }

    // Add tactical safety check for ALL urgency levels
    systemPrompt += `

    TACTICAL SAFETY - MOST IMPORTANT:
    Before suggesting ANY move, you MUST mentally play it out:
    1. If I suggest this move, what can the opponent do NEXT?
    2. Will the piece I move be immediately captured? (Check for queens, rooks, bishops attacking that square)
    3. Does this move leave another piece undefended?
    4. NEVER suggest a move that loses material on the very next move
    5. If capturing a piece, make sure your piece isn't immediately recaptured for free

    Example BAD suggestion: "Knight to D5" when the opponent's Queen can take it next move
    Example GOOD suggestion: "Knight to F3" developing safely to a protected square

    Think one move ahead MINIMUM before suggesting!`;

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
    6. casualComment must be STANDALONE - do NOT reference "both", "these", "either", or the suggestions since they appear AFTER your comment in the UI
    7. casualComment should describe the position or give general chess wisdom

    Example valid responses:
    {"suggestions": [{"move": "Knight to F3", "reasoning": "Solid development"}], "casualComment": "Good time to develop pieces"}
    {"suggestions": [{"move": "Castle Kingside", "reasoning": "King safety"}], "casualComment": "King safety is key right now"}

    DO NOT respond with empty JSON. ALWAYS provide at least one suggestion and a comment.`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${context}\n\nGame phase: ${gamePhase || 'opening'}\nRecent moves: ${moveHistory?.slice(-3).join(', ') || 'None yet'}\n\nWhat moves would you casually suggest?`,
        },
      ],
      max_completion_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');


    const suggestions: MoveSuggestion[] =
      response.suggestions?.map((s: any) => ({
        move: s.move,
        reasoning: s.reasoning,
        casual: true,
      })) || [];


    const result = {
      suggestions: suggestions.slice(0, 2), // Ensure max 2 suggestions
      comment: response.casualComment || 'Your turn!',
    };


    // Save suggestions to game memory
    if (gameId && result.suggestions.length > 0) {
      try {
        const moveNumber = gameContext?.totalMoves || 1;

        await GameMemoryService.addSuggestions(gameId, {
          move_number: moveNumber,
          suggestions: result.suggestions,
          followed: false, // Will be updated when user makes move
          timestamp: new Date().toISOString(),
        });

        // Also save as commentary
        await GameMemoryService.addCommentary(gameId, {
          move_number: moveNumber,
          type: 'suggestion',
          content: `Chester suggests: ${result.suggestions.map((s) => s.move).join(' or ')}. ${result.comment}`,
          timestamp: new Date().toISOString(),
          metadata: {
            urgency_level: analysis.urgencyLevel,
          },
        });

      } catch (error) {
        console.error('Error saving suggestions to game memory:', error);
        // Don't fail the request if memory save fails
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Pre-move analysis error:', error);
    return NextResponse.json({ error: 'Failed to generate move suggestions' }, { status: 500 });
  }
}
