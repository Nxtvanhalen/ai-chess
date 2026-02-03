import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/middleware/rate-limit';

describe('Rate Limiting', () => {
  // Use unique IPs for each test to avoid state pollution
  let testIpCounter = 0;
  const getUniqueIP = () => `test-ip-${Date.now()}-${testIpCounter++}`;

  describe('checkRateLimit', () => {
    it('should allow first request from new IP', () => {
      const ip = getUniqueIP();
      const result = checkRateLimit(ip);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19); // 20 - 1
      expect(result.limit).toBe(20);
    });

    it('should track multiple requests from same IP', () => {
      const ip = getUniqueIP();

      const result1 = checkRateLimit(ip);
      expect(result1.remaining).toBe(19);

      const result2 = checkRateLimit(ip);
      expect(result2.remaining).toBe(18);

      const result3 = checkRateLimit(ip);
      expect(result3.remaining).toBe(17);
    });

    it('should block after limit exceeded', () => {
      const ip = getUniqueIP();

      // Make 20 requests (the limit)
      for (let i = 0; i < 20; i++) {
        const result = checkRateLimit(ip);
        expect(result.allowed).toBe(true);
      }

      // 21st request should be blocked
      const blockedResult = checkRateLimit(ip);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
    });

    it('should track different IPs independently', () => {
      const ip1 = getUniqueIP();
      const ip2 = getUniqueIP();

      // Make requests from ip1
      checkRateLimit(ip1);
      checkRateLimit(ip1);
      checkRateLimit(ip1);

      // ip2 should still have full allowance
      const result = checkRateLimit(ip2);
      expect(result.remaining).toBe(19);
    });

    it('should include resetTime in response', () => {
      const ip = getUniqueIP();
      const result = checkRateLimit(ip);

      expect(result.resetTime).toBeDefined();
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct header format', () => {
      const ip = getUniqueIP();
      const rateLimitResult = checkRateLimit(ip);
      const headers = getRateLimitHeaders(rateLimitResult);

      expect(headers['X-RateLimit-Limit']).toBe('20');
      expect(headers['X-RateLimit-Remaining']).toBe('19');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should show 0 remaining when blocked', () => {
      const ip = getUniqueIP();

      // Exhaust limit
      for (let i = 0; i < 21; i++) {
        checkRateLimit(ip);
      }

      const blockedResult = checkRateLimit(ip);
      const headers = getRateLimitHeaders(blockedResult);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('getClientIP', () => {
    // Create a mock request object since Request is not available in Jest
    const createMockRequest = (headers: Record<string, string>) =>
      ({
        headers: {
          get: (key: string) => headers[key.toLowerCase()] || null,
        },
      }) as unknown as Request;

    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });

      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.2',
      });

      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.2');
    });

    it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
      const request = createMockRequest({
        'cf-connecting-ip': '192.168.1.3',
      });

      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.3');
    });

    it('should return "unknown" when no IP headers present', () => {
      const request = createMockRequest({});

      const ip = getClientIP(request);
      expect(ip).toBe('unknown');
    });

    it('should prefer x-forwarded-for over other headers', () => {
      const request = createMockRequest({
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
        'cf-connecting-ip': '3.3.3.3',
      });

      const ip = getClientIP(request);
      expect(ip).toBe('1.1.1.1');
    });
  });
});
