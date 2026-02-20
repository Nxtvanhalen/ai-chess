import { createUsageLimitError, getUsageHeaders } from '@/lib/supabase/subscription';

describe('Subscription Utilities', () => {
  describe('createUsageLimitError', () => {
    it('should create AI move limit error', () => {
      const error = createUsageLimitError('ai_move', { balance: 0 });

      expect(error.code).toBe('USAGE_LIMIT_EXCEEDED');
      expect(error.error).toContain('AI moves');
      expect(error.details.type).toBe('ai_move');
      expect(error.details.balance).toBe(0);
    });

    it('should create chat limit error', () => {
      const error = createUsageLimitError('chat', { balance: 0 });

      expect(error.code).toBe('USAGE_LIMIT_EXCEEDED');
      expect(error.error).toContain('chat messages');
      expect(error.details.type).toBe('chat');
      expect(error.details.balance).toBe(0);
    });

    it('should include plan in details', () => {
      const error = createUsageLimitError('ai_move', { balance: 0 }, 'pro');

      expect(error.details.plan).toBe('pro');
    });
  });

  describe('getUsageHeaders', () => {
    it('should return AI move balance header', () => {
      const headers = getUsageHeaders('ai_move', {
        balance: 5,
        unlimited: false,
      });

      expect(headers['X-AI-Moves-Balance']).toBe('5');
    });

    it('should return chat balance header', () => {
      const headers = getUsageHeaders('chat', {
        balance: 15,
        unlimited: false,
      });

      expect(headers['X-Chat-Messages-Balance']).toBe('15');
    });

    it('should return "unlimited" for unlimited usage', () => {
      const headers = getUsageHeaders('ai_move', {
        balance: Infinity,
        unlimited: true,
      });

      expect(headers['X-AI-Moves-Balance']).toBe('unlimited');
    });
  });
});
