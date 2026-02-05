import { Chess } from 'chess.js';
import { type NextRequest, NextResponse } from 'next/server';
import { PositionAnalyzer } from '@/lib/chess/positionAnalyzer';
import { getDeepSeekClient } from '@/lib/openai/client';
import { checkRateLimitRedis, getClientIPFromRequest, getRateLimitHeadersRedis } from '@/lib/redis';
import { engineMoveAnalysisSchema, validateRequest } from '@/lib/validation/schemas';

interface CachedAnalysis {
  expiresAt: number;
  payload: {
    commentary: string;
    suggestion: {
      move: string;
      reasoning: string;
    };
  };
}

const analysisCache = new Map<string, CachedAnalysis>();
const ANALYSIS_CACHE_TTL_MS = 45_000;
const LLM_TIMEOUT_MS = Number(process.env.ENGINE_ANALYSIS_TIMEOUT_MS || 4_500);

function getCacheKey(
  fen: string,
  move: string,
  userMove?: string,
  engineEvaluation?: number,
): string {
  const evalBucket =
    engineEvaluation === undefined ? 'na' : Math.round(engineEvaluation * 10).toString();
  return `${fen}|${move}|${userMove || 'none'}|${evalBucket}`;
}

function getCachedAnalysis(cacheKey: string) {
  const entry = analysisCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    analysisCache.delete(cacheKey);
    return null;
  }
  return entry.payload;
}

function setCachedAnalysis(cacheKey: string, payload: CachedAnalysis['payload']) {
  analysisCache.set(cacheKey, {
    expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS,
    payload,
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Engine move analysis timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function buildLiteContext(
  fen: string,
  moveStr: string,
  userMove: string | undefined,
  engineEvaluation: number | undefined,
  analysis: ReturnType<PositionAnalyzer['analyzePosition']>,
) {
  const topThreats = analysis.threats
    .slice(0, 2)
    .map((t) => `${t.square.toUpperCase()} ${t.isHanging ? '(hanging)' : '(contested)'}`)
    .join(', ');

  return [
    `FEN: ${fen}`,
    `Engine move: ${moveStr}`,
    userMove ? `Player move: ${userMove}` : null,
    `Phase: ${analysis.gamePhase}`,
    `Urgency: ${analysis.urgencyLevel}`,
    engineEvaluation !== undefined ? `Eval: ${engineEvaluation.toFixed(2)}` : null,
    topThreats ? `Top threats: ${topThreats}` : 'Top threats: none',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildFallbackResponse(
  engineMoveText: string,
  userMoveText: string | undefined,
  analysis: ReturnType<PositionAnalyzer['analyzePosition']>,
  legalMoveText: string,
) {
  const fallbackCommentary =
    analysis.urgencyLevel === 'emergency'
      ? `${userMoveText ? `You played ${userMoveText}. ` : ''}${engineMoveText} forces accuracy now. Keep it simple and protect loose pieces.`
      : analysis.urgencyLevel === 'tactical'
        ? `${userMoveText ? `After ${userMoveText}, ` : ''}${engineMoveText} keeps things sharp. Look for active moves with immediate threats.`
        : `${userMoveText ? `After ${userMoveText}, ` : ''}${engineMoveText} is solid. Improve your least active piece and keep pressure central.`;

  return {
    commentary: `${fallbackCommentary} Try ${legalMoveText}.`,
    suggestion: {
      move: legalMoveText,
      reasoning: analysis.urgencyLevel === 'emergency' ? 'Stabilize position' : 'Improve activity',
    },
  };
}

function sanToPlainEnglish(san: string): string {
  const trimmed = san.trim();
  if (!trimmed) return san;

  if (trimmed === 'O-O') return 'castles kingside';
  if (trimmed === 'O-O-O') return 'castles queenside';

  const cleaned = trimmed.replace(/[+#?!]+$/g, '');
  const pieceMap: Record<string, string> = {
    K: 'King',
    Q: 'Queen',
    R: 'Rook',
    B: 'Bishop',
    N: 'Knight',
  };

  const pieceLetter = cleaned[0];
  const isPieceMove = Boolean(pieceMap[pieceLetter]);
  const piece = isPieceMove ? pieceMap[pieceLetter] : 'Pawn';
  const isCapture = cleaned.includes('x');
  const destinationMatch = cleaned.match(/([a-h][1-8])/);
  const destination = destinationMatch ? destinationMatch[1].toUpperCase() : '';

  if (!destination) return trimmed;
  if (isCapture) return `${piece} takes on ${destination}`;
  return `${piece} to ${destination}`;
}

function normalizeCommentaryStyle(
  commentary: string,
  userMoveSan: string | undefined,
  engineMoveSan: string,
) {
  let normalized = commentary || '';

  if (userMoveSan) {
    normalized = normalized.replaceAll(userMoveSan, sanToPlainEnglish(userMoveSan));
  }
  normalized = normalized.replaceAll(engineMoveSan, sanToPlainEnglish(engineMoveSan));

  // Best-effort conversion of SAN tokens that may still appear in the text.
  normalized = normalized.replace(
    /\b(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g,
    (token) => sanToPlainEnglish(token),
  );

  return normalized;
}

function pieceName(piece: string): string {
  const map: Record<string, string> = {
    p: 'Pawn',
    n: 'Knight',
    b: 'Bishop',
    r: 'Rook',
    q: 'Queen',
    k: 'King',
  };
  return map[piece] || 'Piece';
}

function formatMoveText(move: { piece: string; to: string; captured?: string }): string {
  const destination = move.to.toUpperCase();
  if (move.piece === 'p') return `Pawn to ${destination}`;
  const piece = pieceName(move.piece);
  return move.captured ? `${piece} to ${destination} takes ${pieceName(move.captured)}` : `${piece} to ${destination}`;
}

function pickDefaultLegalMove(
  legalMoves: Array<{ san: string; piece: string; to: string; captured?: string; from: string }>,
) {
  const checkMove = legalMoves.find((m) => m.san.includes('+'));
  if (checkMove) return checkMove;

  const captureMove = legalMoves.find((m) => m.captured);
  if (captureMove) return captureMove;

  const developmentMove = legalMoves.find(
    (m) => (m.piece === 'n' || m.piece === 'b') && (m.from[1] === '1' || m.from[1] === '8'),
  );
  if (developmentMove) return developmentMove;

  return legalMoves[0] || null;
}

function resolveSuggestedMove(
  suggestionText: string | undefined,
  legalMoves: Array<{ san: string; piece: string; to: string; from: string; captured?: string; flags: string }>,
) {
  if (!suggestionText) return null;

  const text = suggestionText.toLowerCase().trim();

  if (text.includes('castle kingside') || text.includes('o-o')) {
    return legalMoves.find((m) => m.flags.includes('k')) || null;
  }
  if (text.includes('castle queenside') || text.includes('o-o-o')) {
    return legalMoves.find((m) => m.flags.includes('q')) || null;
  }

  const match = suggestionText.match(/(king|queen|rook|bishop|knight|pawn)\s+(?:from\s+([a-h][1-8])\s+)?to\s+([a-h][1-8])/i);
  if (!match) return null;

  const [, pieceWord, fromSquare, toSquare] = match;
  const pieceMap: Record<string, string> = {
    king: 'k',
    queen: 'q',
    rook: 'r',
    bishop: 'b',
    knight: 'n',
    pawn: 'p',
  };
  const piece = pieceMap[pieceWord.toLowerCase()];
  if (!piece) return null;

  const to = toSquare.toLowerCase();
  const from = fromSquare?.toLowerCase();

  const candidates = legalMoves.filter(
    (m) => m.piece === piece && m.to === to && (!from || m.from === from),
  );

  return candidates[0] || null;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
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
    const legalMoves = new Chess(fen).moves({ verbose: true });
    const defaultMove = pickDefaultLegalMove(legalMoves);
    const defaultMoveText = defaultMove ? formatMoveText(defaultMove) : 'No legal moves';
    const engineMoveText = sanToPlainEnglish(moveStr);
    const userMoveText = userMove ? sanToPlainEnglish(userMove) : undefined;
    const analyzer = new PositionAnalyzer(fen);
    const analysis = analyzer.analyzePosition();
    const context = buildLiteContext(fen, moveStr, userMove, engineEvaluation, analysis);

    const cacheKey = getCacheKey(fen, moveStr, userMove, engineEvaluation);
    const cached = getCachedAnalysis(cacheKey);
    if (cached) {
      return NextResponse.json({
        commentary: cached.commentary,
        suggestion: cached.suggestion,
        analysis: {
          move: moveStr,
          evaluation: engineEvaluation || 0,
          depth: 10,
          cached: true,
        },
      });
    }

    const systemPrompt = `You are Chester, a strong chess buddy with dry wit.

Return ${userMove ? '1-2 short sentences about BOTH moves' : '1 short sentence about the engine move'} and suggest ONE safe next move.

Rules:
- Describe what happened; do not speculate.
- Keep tone dry, witty, concise.
- Tactical safety first: do not suggest a move that drops material immediately.
- Never use SAN notation (e.g., Nf3, Qxd5+, O-O). Use plain English move names.

Return valid JSON in EXACTLY this format:
    {
      "commentary": "Brief analysis. Try [move] for [reason].",
      "suggestion": {
        "move": "Knight to F3",
        "reasoning": "Development"
      }
    }

Mandatory:
- Include both "commentary" and "suggestion".
- Reasoning must be 3-5 words.
- Use simple move text ("Knight to F3", not "Nf3").`;

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

    let payload: CachedAnalysis['payload'];
    try {
      const deepseek = getDeepSeekClient();
      const completion = await withTimeout(
        deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `${context}${evaluationContext}${userMoveContext}${urgencyContext}\n\nThe engine just played: ${moveStr}\n\nWhat's your casual take on ${userMove ? 'these moves' : 'this move'}, and what should the player try next?`,
            },
          ],
          max_completion_tokens: 160,
          response_format: { type: 'json_object' },
        }),
        LLM_TIMEOUT_MS,
      );

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      payload = {
        commentary: normalizeCommentaryStyle(
          response.commentary || 'Interesting move by the engine.',
          userMove,
          moveStr,
        ),
        suggestion: response.suggestion || { move: 'Develop a piece', reasoning: 'Good play' },
      };
    } catch (llmError) {
      console.warn('[EngineAnalysis] Falling back to local commentary:', llmError);
      payload = buildFallbackResponse(engineMoveText, userMoveText, analysis, defaultMoveText);
    }

    // Enforce legal move suggestions to prevent impossible recommendations.
    const resolvedMove = resolveSuggestedMove(payload.suggestion?.move, legalMoves) || defaultMove;
    if (resolvedMove) {
      payload.suggestion = {
        move: formatMoveText(resolvedMove),
        reasoning: (payload.suggestion?.reasoning || 'Practical move').split(' ').slice(0, 5).join(' '),
      };
      if (!payload.commentary?.toLowerCase().includes('try ')) {
        payload.commentary = `${payload.commentary?.trim() || 'Interesting sequence.'} Try ${payload.suggestion.move}.`;
      }
    } else {
      payload.suggestion = {
        move: 'No legal moves',
        reasoning: 'Position is game over',
      };
    }

    setCachedAnalysis(cacheKey, payload);

    console.log(`[EngineAnalysis] Total: ${Date.now() - startedAt}ms`);
    return NextResponse.json({
      commentary: payload.commentary,
      suggestion: payload.suggestion,
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
