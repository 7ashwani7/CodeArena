import { describe, it, expect } from 'vitest';
import { escapeRegex, buildProblemFilter } from '../src/utils/queryFilter.js';

describe('Unit Tests: queryFilter & SQL/NoSQL Injection Safety', () => {
  describe('escapeRegex', () => {
    it('escapes all special regex characters safely', () => {
      const dangerous = '.*+?^${}()|[]\\';
      const escaped = escapeRegex(dangerous);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');

      // Verify RegExp treats escaped string as literal
      const re = new RegExp(escaped);
      expect(re.test('.*+?^${}()|[]\\')).toBe(true);
      expect(re.test('arbitrary_string')).toBe(false);
    });

    it('prevents catastrophic regex denial of service patterns', () => {
      const redosAttempt = '((a+)+)+$';
      const escaped = escapeRegex(redosAttempt);
      expect(escaped).toBe('\\(\\(a\\+\\)\\+\\)\\+\\$');
    });
  });

  describe('buildProblemFilter', () => {
    it('defaults to published problems only when includeUnpublished is false', () => {
      const filter = buildProblemFilter({}, false);
      expect(filter).toEqual({ publicationStatus: 'published' });
    });

    it('allows admin override of publication status', () => {
      expect(buildProblemFilter({ status: 'draft' }, true)).toEqual({ publicationStatus: 'draft' });
      expect(buildProblemFilter({ status: 'archived' }, true)).toEqual({ publicationStatus: 'archived' });
      expect(buildProblemFilter({ status: 'published' }, true)).toEqual({ publicationStatus: 'published' });
    });

    it('ignores invalid publication status for admin override', () => {
      const filter = buildProblemFilter({ status: 'unauthorized_status' }, true);
      expect(filter.publicationStatus).toBeUndefined();
    });

    it('filters by whitelisted difficulty with case normalization', () => {
      expect(buildProblemFilter({ difficulty: 'easy' })).toMatchObject({ difficulty: 'Easy' });
      expect(buildProblemFilter({ difficulty: 'MEDIUM' })).toMatchObject({ difficulty: 'Medium' });
      expect(buildProblemFilter({ difficulty: 'Hard' })).toMatchObject({ difficulty: 'Hard' });
    });

    it('rejects invalid or injected difficulty values', () => {
      const filter = buildProblemFilter({ difficulty: 'ExtremelyHard' });
      expect(filter.difficulty).toBeUndefined();

      const injectionFilter = buildProblemFilter({ difficulty: { $ne: null } });
      expect(injectionFilter.difficulty).toBeUndefined();
    });

    it('filters by topic string with trimming', () => {
      const filter = buildProblemFilter({ topic: '  Arrays & Hashing  ' });
      expect(filter.topics).toBe('Arrays & Hashing');
    });

    it('ignores non-string topic values to prevent operator injection', () => {
      const filter = buildProblemFilter({ topic: { $in: ['admin', 'secret'] } });
      expect(filter.topics).toBeUndefined();
    });

    it('safely escapes search keyword with regex case-insensitive options', () => {
      const filter = buildProblemFilter({ search: 'Two (Sum)? [Easy]' });
      expect(filter.title).toEqual({
        $regex: 'Two \\(Sum\\)\\? \\[Easy\\]',
        $options: 'i'
      });
    });

    it('ignores empty search query or non-string search values', () => {
      expect(buildProblemFilter({ search: '   ' }).title).toBeUndefined();
      expect(buildProblemFilter({ search: { $gt: '' } }).title).toBeUndefined();
    });

    it('resists prototype pollution payloads', () => {
      const maliciousPayload = JSON.parse('{"__proto__": {"isAdmin": true}, "search": "test"}');
      const filter = buildProblemFilter(maliciousPayload);
      expect(filter.isAdmin).toBeUndefined();
      expect(filter.title).toBeDefined();
    });
  });
});
