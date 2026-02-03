import { type NextRequest, NextResponse } from 'next/server';
import { PositionAnalyzer } from '@/lib/chess/positionAnalyzer';
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

    const { engineMove, userMove, fen, engineEvaluation, alternatives } = validation.data;

    // Handle engineMove being either a string or an object with san property
    const moveStr = typeof engineMove === 'string' ? engineMove : engineMove.san || '';
    const context = formatMoveContext(fen, moveStr);

    // Analyze position to inform suggestion
    const analyzer = new PositionAnalyzer(fen);
    const analysis = analyzer.analyzePosition();

    const systemPrompt = `You are Chester, a chess buddy watching the player battle a chess engine.

    ${userMove ? 'React to BOTH moves in 1-2 short sentences, then suggest ONE next move.' : 'React to the engine move in ONE sentence, then suggest ONE next move.'} Be dry and witty.

    CRITICAL: Describe what ACTUALLY HAPPENED, not what you think might happen next.
    - If it retreated, say it retreated
    - If it captured, say it captured
    - If it developed a piece, note that
    - DO NOT say "it wants your pawn" if it didn't take the pawn
    - DO NOT predict what will happen next

    Good examples:
    - "Retreating? Defensive play. Try Knight to F3 for development."
    - "That bishop's running away. Castle kingside for safety."
    - "Solid development. Push the E-pawn to gain space."
    - "That's aggressive. Bishop to E7 develops while defending."
    ${userMove ? '- "Solid pawn push. Engine responds with development. Try Knight to C6 for piece activity."' : ''}
    ${userMove ? '- "You advanced aggressively. Engine retreats. Castle to consolidate your position."' : ''}

    Bad examples (DON'T DO THIS):
    - "It eyeballed your pawn" (unless it actually took it)
    - "It wants blood" (too vague/predictive)
    - "Setting a trap" (unless obvious)

    TACTICAL SAFETY - CRITICAL:
    Before suggesting ANY move, you MUST mentally play it out:
    1. If I suggest this move, what can the opponent do NEXT?
    2. Will the piece I move be immediately captured?
    3. Does this move leave another piece undefended?
    4. NEVER suggest a move that loses material on the very next move
    5. If capturing a piece, make sure your piece isn't immediately recaptured for free

    RESPONSE FORMAT:
    You MUST respond with valid JSON in EXACTLY this format:
    {
      "commentary": "1-2 sentences analyzing the moves. Try [move] for [reason].",
      "suggestion": {
        "move": "Knight to F3",
        "reasoning": "Development"
      }
    }

    MANDATORY RULES:
    1. ALWAYS include "commentary" string with analysis + suggestion
    2. ALWAYS include "suggestion" object with "move" and "reasoning"
    3. Keep reasoning to 3-5 words
    4. Use simple descriptions: "Knight to F3" not "Nf3"
    5. The suggestion should be integrated naturally into the commentary text`;

    const evaluationContext =
      engineEvaluation !== undefined
        ? `\nEngine evaluation: ${engineEvaluation > 0 ? '+' : ''}${engineEvaluation.toFixed(2)}`
        : '';

    const userMoveContext = userMove ? `\n\nPlayer just made: ${userMove}` : '';

    const urgencyContext = analysis.urgencyLevel === 'emergency'
      ? '\n\nURGENT SITUATION: Focus on critical issues (check, hanging pieces, free captures)'
      : analysis.urgencyLevel === 'tactical'
        ? '\n\nTACTICAL OPPORTUNITY: Look for active play and threats'
        : '\n\nSTRATEGIC POSITION: Focus on piece activity, king safety, or pawn structure';

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${context}${evaluationContext}${userMoveContext}${urgencyContext}\n\nThe engine just played: ${moveStr}\n\nWhat's your casual take on ${userMove ? 'these moves' : 'this move'}, and what should the player try next?`,
        },
      ],
      max_completion_tokens: 200, // Increased for analysis + suggestion
      response_format: { type: 'json_object' },
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    const commentary = response.commentary || 'Interesting move by the engine.';
    const suggestion = response.suggestion || { move: 'Develop a piece', reasoning: 'Good play' };

    return NextResponse.json({
      commentary,
      suggestion,
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
