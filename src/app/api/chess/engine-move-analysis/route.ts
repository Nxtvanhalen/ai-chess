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
const ANALYSIS_CACHE_MAX_SIZE = 500;
const ANALYSIS_CACHE_TTL_MS = 45_000;
const LLM_TIMEOUT_MS = Number(process.env.ENGINE_ANALYSIS_TIMEOUT_MS || 4_500);
const CENTRAL_FILES = new Set(['c', 'd', 'e', 'f']);
const FLANK_FILES = new Set(['a', 'h']);

type EngineLegalMove = {
  from: string;
  to: string;
  piece: string;
  captured?: string;
  san: string;
  flags: string;
};

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
  // Evict oldest entries if cache is at capacity
  if (analysisCache.size >= ANALYSIS_CACHE_MAX_SIZE) {
    const firstKey = analysisCache.keys().next().value;
    if (firstKey) analysisCache.delete(firstKey);
  }
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
  // Intentionally excludes bare pawn pushes like "e4" to avoid corrupting
  // already-plain-English phrases such as "Bishop to G2".
  normalized = normalized.replace(
    /\b(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][18]=[QRBN][+#]?)\b/g,
    (token) => sanToPlainEnglish(token),
  );

  return normalized;
}

function sanitizeCommentaryClaims(
  commentary: string,
  userMoveSan: string | undefined,
  engineMoveSan: string,
) {
  let normalized = commentary;
  const hasActualCheck =
    Boolean(userMoveSan && /[+#]/.test(userMoveSan)) || /[+#]/.test(engineMoveSan);

  // If neither move is check/checkmate, avoid claiming check happened.
  if (!hasActualCheck) {
    normalized = normalized.replace(/\bcheckmate\b/gi, 'winning pressure');
    normalized = normalized.replace(/\bcheck\b/gi, 'pressure');
  }

  return normalized;
}

function normalizeMovePhraseCasing(text: string) {
  return text
    .replace(
      /\b(king|queen|rook|bishop|knight|pawn)\s+to\s+([a-h][1-8])\b/gi,
      (_, piece: string, square: string) =>
        `${piece.charAt(0).toUpperCase()}${piece.slice(1).toLowerCase()} to ${square.toUpperCase()}`,
    )
    .replace(
      /\b(king|queen|rook|bishop|knight|pawn)\s+takes(?:\s+on)?\s+([a-h][1-8])\b/gi,
      (_, piece: string, square: string) =>
        `${piece.charAt(0).toUpperCase()}${piece.slice(1).toLowerCase()} takes on ${square.toUpperCase()}`,
    );
}

function alignCommentaryWithSuggestion(
  commentary: string,
  suggestionMove: string,
  suggestionReasoning: string,
) {
  const cleaned = commentary
    // Remove any model-provided "Try ..." instruction so we can inject the validated move.
    .replace(/\bTry\s+[^.?!]*(?:[.?!]|$)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const base = cleaned.length > 0 ? cleaned : 'Solid position.';
  const punctuation = /[.?!]$/.test(base) ? '' : '.';
  return `${base}${punctuation} Try ${suggestionMove} for ${suggestionReasoning}.`;
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
  legalMoves: EngineLegalMove[],
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
  legalMoves: EngineLegalMove[],
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

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

function getAttackers(chess: Chess, square: string, attackerColor: 'w' | 'b') {
  const fenParts = chess.fen().split(' ');
  fenParts[1] = attackerColor;
  const attackerView = new Chess(fenParts.join(' '));
  return attackerView.moves({ verbose: true }).filter((m) => m.to === square);
}

function isMoveTacticallySafe(
  positionFen: string,
  move: EngineLegalMove,
) {
  const chess = new Chess(positionFen);
  chess.move(move.san);

  const opponentColor = chess.turn();
  const myColor = opponentColor === 'w' ? 'b' : 'w';
  const attackers = getAttackers(chess, move.to, opponentColor as 'w' | 'b');
  const defenders = getAttackers(chess, move.to, myColor as 'w' | 'b');

  if (attackers.length === 0) return true;

  const movedPieceValue = PIECE_VALUE[move.piece] || 1;

  // Hard reject obvious hangs of minor pieces or better.
  if (movedPieceValue >= 3 && defenders.length === 0) return false;

  // Reject if a low-value attacker can win a high-value moved piece immediately.
  const cheapestAttackerValue = Math.min(
    ...attackers.map((a) => PIECE_VALUE[a.piece] || 9),
  );
  if (movedPieceValue - cheapestAttackerValue >= 2 && attackers.length > defenders.length) {
    return false;
  }

  return true;
}

function isFlankPawnPush(move: EngineLegalMove): boolean {
  return move.piece === 'p' && FLANK_FILES.has(move.to[0]) && !move.captured;
}

function scoreMoveRelevance(
  fen: string,
  move: EngineLegalMove,
  analysis: ReturnType<PositionAnalyzer['analyzePosition']>,
) {
  const chess = new Chess(fen);
  const currentColor = chess.turn();
  const myThreats = analysis.threats.filter((t) => t.piece.startsWith(currentColor));
  const threatenedSquares = new Set(
    myThreats
      .filter((t) => t.value >= 3 || t.isHanging)
      .map((t) => t.square.toLowerCase()),
  );

  let score = 0;

  if (move.captured) score += 10 + (PIECE_VALUE[move.captured] || 1) * 3;
  if (move.san.includes('+')) score += 10;
  if (threatenedSquares.has(move.from.toLowerCase())) score += 12;
  if (move.piece === 'k' && chess.inCheck()) score += 15;

  const fromRank = move.from[1];
  if ((move.piece === 'n' || move.piece === 'b') && (fromRank === '1' || fromRank === '8')) score += 5;
  if (move.piece === 'p' && CENTRAL_FILES.has(move.to[0])) score += 4;
  if (CENTRAL_FILES.has(move.to[0])) score += 2;

  if (analysis.urgencyLevel === 'emergency') {
    if (isFlankPawnPush(move)) score -= 14;
    if (move.piece === 'p' && !move.captured && !CENTRAL_FILES.has(move.to[0])) score -= 6;
  } else if (analysis.urgencyLevel === 'tactical') {
    if (isFlankPawnPush(move)) score -= 8;
  } else if (isFlankPawnPush(move)) {
    score -= 3;
  }

  return score;
}

function reasoningForMove(
  move: EngineLegalMove,
  analysis: ReturnType<PositionAnalyzer['analyzePosition']>,
) {
  if (move.captured) return `Wins ${pieceName(move.captured).toLowerCase()}`;
  if (move.piece === 'k' && analysis.urgencyLevel === 'emergency') return 'King safety first';
  if (move.san.includes('+')) return 'Creates immediate pressure';
  if ((move.piece === 'n' || move.piece === 'b') && (move.from[1] === '1' || move.from[1] === '8')) {
    return 'Develops active piece';
  }
  if (move.piece === 'p' && CENTRAL_FILES.has(move.to[0])) return 'Controls center squares';
  return 'Improves piece activity';
}

function pickSafeMove(
  fen: string,
  preferredMove: EngineLegalMove | null,
  legalMoves: EngineLegalMove[],
  fallbackMove: EngineLegalMove | null,
  analysis: ReturnType<PositionAnalyzer['analyzePosition']>,
) {
  const safeMoves = legalMoves.filter((move) => isMoveTacticallySafe(fen, move));
  const candidates = safeMoves.length > 0 ? safeMoves : legalMoves;
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((move) => ({ move, score: scoreMoveRelevance(fen, move, analysis) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0]?.move || null;
  if (!best) return fallbackMove || legalMoves[0] || null;

  if (preferredMove && candidates.some((m) => m.san === preferredMove.san)) {
    const preferredScore = scoreMoveRelevance(fen, preferredMove, analysis);
    const bestScore = scored[0].score;
    // Keep LLM preference only if it's reasonably close to best relevance.
    if (bestScore - preferredScore <= 3) {
      return preferredMove;
    }
  }

  if (fallbackMove && candidates.some((m) => m.san === fallbackMove.san)) {
    const fallbackScore = scoreMoveRelevance(fen, fallbackMove, analysis);
    const bestScore = scored[0].score;
    if (bestScore - fallbackScore <= 1) {
      return fallbackMove;
    }
  }

  return best;
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
    const legalMoves = new Chess(fen).moves({ verbose: true }) as EngineLegalMove[];
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
        commentary: normalizeMovePhraseCasing(
          sanitizeCommentaryClaims(
            normalizeCommentaryStyle(
              response.commentary || 'Interesting move by the engine.',
              userMove,
              moveStr,
            ),
            userMove,
            moveStr,
          ),
        ),
        suggestion: response.suggestion || { move: 'Develop a piece', reasoning: 'Good play' },
      };
    } catch (llmError) {
      console.warn('[EngineAnalysis] Falling back to local commentary:', llmError);
      payload = buildFallbackResponse(engineMoveText, userMoveText, analysis, defaultMoveText);
    }

    // Enforce legal move suggestions to prevent impossible recommendations.
    const resolvedMove = resolveSuggestedMove(payload.suggestion?.move, legalMoves);
    const selectedMove = pickSafeMove(fen, resolvedMove, legalMoves, defaultMove, analysis);
    const finalMove = selectedMove || defaultMove;
    if (finalMove) {
      const reasoning = reasoningForMove(finalMove, analysis);

      payload.suggestion = {
        move: formatMoveText(finalMove),
        reasoning,
      };
      payload.commentary = alignCommentaryWithSuggestion(
        payload.commentary?.trim() || 'Interesting sequence.',
        payload.suggestion.move,
        reasoning,
      );
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
