import { generateSimpleId } from '@/lib/utils/uuid';

describe('UUID Utilities', () => {
  describe('generateSimpleId', () => {
    it('should generate a string ID', () => {
      const id = generateSimpleId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSimpleId());
      }
      // All 100 IDs should be unique
      expect(ids.size).toBe(100);
    });

    it('should contain timestamp component', () => {
      const before = Date.now();
      const id = generateSimpleId();
      const after = Date.now();

      // ID format is "timestamp-random"
      const timestampPart = parseInt(id.split('-')[0], 10);
      expect(timestampPart).toBeGreaterThanOrEqual(before);
      expect(timestampPart).toBeLessThanOrEqual(after);
    });

    it('should contain random component', () => {
      const id = generateSimpleId();
      const parts = id.split('-');

      // Should have at least timestamp and random parts
      expect(parts.length).toBeGreaterThanOrEqual(2);

      // Random part should be alphanumeric
      const randomPart = parts.slice(1).join('-');
      expect(randomPart).toMatch(/^[a-z0-9]+$/);
    });

    it('should be suitable for use as React keys', () => {
      const id = generateSimpleId();

      // Should not contain any characters that would be problematic for React keys
      expect(id).not.toContain(' ');
      expect(id).not.toContain('\n');
      expect(id).not.toContain('\t');
    });
  });
});
