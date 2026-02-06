/**
 * Shared prompt utilities for Chester's chat routes
 * Used by both streaming and non-streaming chat endpoints
 */

import { formatMoveContext } from '@/lib/openai/chess-butler-prompt';

/**
 * Converts an array of mixed items into a comma-separated prompt string.
 * Prioritizes common field names for object items.
 */
export function listToPromptText(items: unknown[]): string {
  return items
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        return String(item);
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const prioritizedKeys = ['name', 'move', 'theme', 'label', 'content', 'type'];
        for (const key of prioritizedKeys) {
          if (typeof record[key] === 'string' && record[key]) return record[key] as string;
        }
        const firstStringValue = Object.values(record).find((v) => typeof v === 'string' && v);
        if (typeof firstStringValue === 'string') return firstStringValue;
      }
      return '';
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Safely converts an unknown value to a prompt-friendly string.
 * Handles primitives, arrays, and objects with prioritized key lookup.
 */
export function promptValue(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return listToPromptText(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const prioritizedKeys = ['content', 'text', 'name', 'move', 'theme', 'label', 'type'];
    for (const key of prioritizedKeys) {
      if (typeof record[key] === 'string' && record[key]) return record[key] as string;
    }
    const firstStringValue = Object.values(record).find((v) => typeof v === 'string' && v);
    if (typeof firstStringValue === 'string') return firstStringValue;
  }
  return fallback;
}

/**
 * Builds Chester's personality instructions from memory context
 */
export function buildPersonalityInstructions(chesterPersonality: any): string {
  if (!chesterPersonality) return '';

  let instructions = `\n\nYOUR RELATIONSHIP WITH CHRIS:
- Rapport Level: ${chesterPersonality.rapportLevel}/10
- Games Played Together: ${chesterPersonality.gamesPlayed}
- Current Performance: ${promptValue(chesterPersonality.recentPerformance, 'neutral')}
- Current Streak: ${chesterPersonality.currentStreak > 0 ? `${chesterPersonality.currentStreak} wins` : 'none'}`;

  if (chesterPersonality.commonMistakes.length > 0) {
    instructions += `\n- Common Patterns to Watch: ${listToPromptText(chesterPersonality.commonMistakes)}`;
  }

  if (chesterPersonality.strongAreas.length > 0) {
    instructions += `\n- Strong Areas: ${listToPromptText(chesterPersonality.strongAreas)}`;
  }

  return instructions;
}

/**
 * Builds board state instructions from game context
 */
export function buildBoardStateInstructions(gameContext: any): string {
  if (!gameContext?.fen) {
    return `\n\nNote: No current board state available. Ask them to make a move if you need to see the position.`;
  }

  let instructions = `\n\nCURRENT BOARD STATE - You CAN see the board clearly:\n${formatMoveContext(gameContext.fen, gameContext.lastMove)}`;

  if (gameContext.totalMoves) {
    instructions += `\n\nGame Progress: ${gameContext.totalMoves} moves have been played.`;
  }

  return instructions;
}

/**
 * Builds game memory context instructions (tactical themes, narrative, commentary)
 */
export function buildGameMemoryInstructions(fullGameContext: any): string {
  if (!fullGameContext) return '';

  let instructions = '';

  if (fullGameContext.tacticalThemes.length > 0) {
    instructions += `\n\nTactical Themes in This Game: ${listToPromptText(fullGameContext.tacticalThemes)}`;
  }

  if (fullGameContext.gameNarrative) {
    instructions += `\n\nGame Story So Far: ${promptValue(fullGameContext.gameNarrative)}`;
  }

  const recentCommentary = fullGameContext.chesterCommentary.slice(-5);
  if (recentCommentary.length > 0) {
    instructions += `\n\nYour Recent Commentary:`;
    recentCommentary.forEach((comment: any) => {
      instructions += `\n- Move ${comment.move_number}: ${promptValue(comment.content)}`;
    });
  }

  return instructions;
}
