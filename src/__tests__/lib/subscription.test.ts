import { createUsageLimitError, getUsageHeaders } from '@/lib/supabase/subscription';

describe('Subscription Utilities', () => {
  describe('createUsageLimitError', () => {
    it('should create AI move limit error', () => {
      const error = createUsageLimitError('ai_move', {
        remaining: 0,
        limit: 10,
      });

      expect(error.code).toBe('USAGE_LIMIT_EXCEEDED');
      expect(error.error).toContain('AI move limit');
      expect(error.details.type).toBe('ai_move');
      expect(error.details.remaining).toBe(0);
      expect(error.details.limit).toBe(10);
      expect(error.details.resetAt).toBeDefined();
    });

    it('should create chat limit error', () => {
      const error = createUsageLimitError('chat', {
        remaining: 0,
        limit: 20,
      });

      expect(error.code).toBe('USAGE_LIMIT_EXCEEDED');
      expect(error.error).toContain('chat message limit');
      expect(error.details.type).toBe('chat');
      expect(error.details.remaining).toBe(0);
      expect(error.details.limit).toBe(20);
    });

    it('should set resetAt to midnight UTC', () => {
      const error = createUsageLimitError('ai_move', {
        remaining: 0,
        limit: 10,
      });

      const resetDate = new Date(error.details.resetAt);
      expect(resetDate.getUTCHours()).toBe(0);
      expect(resetDate.getUTCMinutes()).toBe(0);
      expect(resetDate.getUTCSeconds()).toBe(0);
    });
  });

  describe('getUsageHeaders', () => {
    it('should return AI move headers', () => {
      const headers = getUsageHeaders('ai_move', {
        remaining: 5,
        limit: 10,
        unlimited: false,
      });

      expect(headers['X-AI-Moves-Remaining']).toBe('5');
      expect(headers['X-AI-Moves-Limit']).toBe('10');
    });

    it('should return chat headers', () => {
      const headers = getUsageHeaders('chat', {
        remaining: 15,
        limit: 20,
        unlimited: false,
      });

      expect(headers['X-Chat-Messages-Remaining']).toBe('15');
      expect(headers['X-Chat-Messages-Limit']).toBe('20');
    });

    it('should return "unlimited" for unlimited usage', () => {
      const headers = getUsageHeaders('ai_move', {
        remaining: Infinity,
        limit: -1,
        unlimited: true,
      });

      expect(headers['X-AI-Moves-Remaining']).toBe('unlimited');
      expect(headers['X-AI-Moves-Limit']).toBe('unlimited');
    });
  });
});
