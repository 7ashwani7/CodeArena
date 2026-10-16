import { describe, it, expect } from 'vitest';
import { compareOutputs, normalizeOutputString } from '../src/utils/outputComparator.js';

describe('Unit Tests: outputComparator', () => {
  describe('normalizeOutputString', () => {
    it('handles empty and null values gracefully', () => {
      expect(normalizeOutputString('')).toBe('');
      expect(normalizeOutputString(null)).toBe('');
      expect(normalizeOutputString(undefined)).toBe('');
    });

    it('normalizes Windows CRLF and classic Mac CR line endings to LF', () => {
      expect(normalizeOutputString('line1\r\nline2\r\nline3')).toBe('line1\nline2\nline3');
      expect(normalizeOutputString('line1\rline2\rline3')).toBe('line1\nline2\nline3');
    });

    it('trims trailing whitespaces per line while preserving leading indentation', () => {
      const input = '    def solution():   \n        return 42    ';
      const expected = '    def solution():\n        return 42';
      expect(normalizeOutputString(input)).toBe(expected);
    });

    it('trims boundary blank lines while preserving indentation', () => {
      const input = '\n\n   result = 100   \n\n';
      expect(normalizeOutputString(input)).toBe('   result = 100');
    });
  });

  describe('compareOutputs', () => {
    it('matches identical strings and trimmed line endings', () => {
      expect(compareOutputs('output\r\n', 'output\n')).toBe(true);
      expect(compareOutputs('42', '42')).toBe(true);
      expect(compareOutputs('hello world', 'hello world')).toBe(true);
    });

    it('differentiates non-matching plain text', () => {
      expect(compareOutputs('hello', 'world')).toBe(false);
      expect(compareOutputs('abc def', 'abc  def')).toBe(false);
    });

    it('evaluates deep JSON array equivalence regardless of whitespace formatting', () => {
      expect(compareOutputs('[1, 2, 3]', '[1,2,3]')).toBe(true);
      expect(compareOutputs('[\n  1,\n  2,\n  3\n]', '[1, 2, 3]')).toBe(true);
      expect(compareOutputs('[[1, 2], [3, 4]]', '[[1,2],[3,4]]')).toBe(true);
      expect(compareOutputs('[1, 2, 3]', '[1, 2, 4]')).toBe(false);
      expect(compareOutputs('[1, 2]', '[1, 2, 3]')).toBe(false);
    });

    it('evaluates deep JSON object equivalence with unordered keys', () => {
      expect(compareOutputs('{"a": 1, "b": 2}', '{"b": 2, "a": 1}')).toBe(true);
      expect(compareOutputs('{"user": {"id": 1, "name": "test"}}', '{"user": {"name": "test", "id": 1}}')).toBe(true);
      expect(compareOutputs('{"a": 1}', '{"a": 2}')).toBe(false);
      expect(compareOutputs('{"a": 1}', '{"b": 1}')).toBe(false);
    });

    it('handles boolean case insensitivity', () => {
      expect(compareOutputs('true', 'True')).toBe(true);
      expect(compareOutputs('FALSE', 'false')).toBe(true);
      expect(compareOutputs('True\n', 'true')).toBe(true);
      expect(compareOutputs('true', 'false')).toBe(false);
    });

    it('handles floating point values with numerical tolerance', () => {
      expect(compareOutputs('3.14159265', '3.14159265')).toBe(true);
      expect(compareOutputs('1.0000001', '1.0000002')).toBe(true);
      expect(compareOutputs('1.05', '1.06')).toBe(false);
      expect(compareOutputs('0', '0.0')).toBe(true);
    });

    it('handles null, undefined and empty string representations', () => {
      expect(compareOutputs(null, '')).toBe(true);
      expect(compareOutputs(undefined, '')).toBe(true);
      expect(compareOutputs('', '')).toBe(true);
      expect(compareOutputs('nonempty', '')).toBe(false);
    });
  });
});
