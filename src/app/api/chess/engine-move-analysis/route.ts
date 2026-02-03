import { type NextRequest, NextResponse } from 'next/server';
import { formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { getOpenAIClient } from '@/lib/openai/client';
import { checkRateLimitRedis, getClientIPFromRequest, getRateLimitHeadersRedis } from '@/lib/redis';
import { engineMoveAnalysisSchema, validateRequest } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit (Redis-based, falls back to in-memory)
    const clientIP = getClientIPFromRequest(request);
    const rateLimitResult = await checkRateLimitRedis(clientIP, 'moveAnalysis');

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
    const validation = validateRequest(engineMoveAnalysisSchema, body);
    if (!validation.success) {
      console.error('Engine move analysis - Validation failed:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { engineMove, fen, engineEvaluation, alternatives } = validation.data;

    // Handle engineMove being either a string or an object with san property
    const moveStr = typeof engineMove === 'string' ? engineMove : engineMove.san || '';
    const context = formatMoveContext(fen, moveStr);

    const systemPrompt = `You are Chester, Chris's chess buddy watching him play against a chess engine.

    The engine just made a move. React in ONE sentence. Be dry and witty.

    CRITICAL: Describe what the engine ACTUALLY DID, not what you think it might want to do.
    - If it retreated, say it retreated
    - If it captured, say it captured
    - If it developed a piece, note that
    - DO NOT say "it wants your pawn" if it didn't take the pawn
    - DO NOT predict what it will do next

    Good examples:
    - "Retreating? Defensive play."
    - "That bishop's running away."
    - "Solid development."
    - "That's aggressive."
    - "A capture—equalizing material."
    - "Castled. Playing it safe."

    Bad examples (DON'T DO THIS):
    - "It eyeballed your pawn" (unless it actually took it)
    - "It wants blood" (too vague/predictive)
    - "Setting a trap" (unless obvious)

    Remember: Describe the actual move played, brief and sarcastic.`;

    const evaluationContext =
      engineEvaluation !== undefined
        ? `\nEngine evaluation: ${engineEvaluation > 0 ? '+' : ''}${engineEvaluation.toFixed(2)}`
        : '';

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${context}${evaluationContext}\n\nThe engine just played: ${moveStr}\n\nWhat's your casual take on this move?`,
        },
      ],
      max_completion_tokens: 50, // One sentence
    });

    const commentary = completion.choices[0].message.content || 'Interesting move by the engine.';

    return NextResponse.json({
      commentary,
      analysis: {
        move: moveStr,
        evaluation: engineEvaluation || 0,
        depth: 10, // You could get this from the engine
      },
    });
  } catch (error) {
    console.error('Engine move analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze engine move' }, { status: 500 });
  }
}
