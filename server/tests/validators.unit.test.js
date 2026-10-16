import { describe, it, expect } from 'vitest';
import { validateRegister, validateLogin } from '../src/validators/auth.validator.js';
import {
  validateProblemQuery,
  validateProblemSlug,
  validateProblemPayload
} from '../src/validators/problem.validator.js';
import { validateSubmissionHistoryQuery } from '../src/validators/submission.validator.js';
import {
  validateUpdateProfile,
  validateProblemIdParam,
  validateBookmarkQuery
} from '../src/validators/user.validator.js';

describe('Unit Tests: Request Validators', () => {
  describe('auth.validator', () => {
    describe('validateRegister', () => {
      it('accepts valid registration payload', () => {
        const result = validateRegister({
          username: 'ValidUser_123',
          email: 'User@Example.COM',
          password: 'Password123!',
          name: 'Jane Doe'
        });

        expect(result.username).toBe('validuser_123');
        expect(result.email).toBe('user@example.com');
        expect(result.password).toBe('Password123!');
        expect(result.name).toBe('Jane Doe');
      });

      it('rejects missing or invalid username', () => {
        expect(() => validateRegister({ email: 'a@b.com', password: 'password123' })).toThrow(/Validation failed/);
        expect(() => validateRegister({ username: 'ab', email: 'a@b.com', password: 'password123' })).toThrow(/Validation failed/);
        expect(() => validateRegister({ username: 'invalid name with spaces', email: 'a@b.com', password: 'password123' })).toThrow(/Validation failed/);
      });

      it('rejects invalid email formats', () => {
        expect(() => validateRegister({ username: 'coder', email: 'not-an-email', password: 'password123' })).toThrow(/Validation failed/);
        expect(() => validateRegister({ username: 'coder', email: 'test@', password: 'password123' })).toThrow(/Validation failed/);
      });

      it('rejects short (<8) and excessively long (>128) passwords', () => {
        expect(() => validateRegister({ username: 'coder', email: 'a@b.com', password: '123' })).toThrow(/Validation failed/);
        expect(() => validateRegister({ username: 'coder', email: 'a@b.com', password: 'x'.repeat(129) })).toThrow(/Validation failed/);
      });
    });

    describe('validateLogin', () => {
      it('accepts valid login with email', () => {
        const result = validateLogin({ email: 'test@codearena.dev', password: 'secretpassword' });
        expect(result.emailOrUsername).toBe('test@codearena.dev');
        expect(result.password).toBe('secretpassword');
      });

      it('accepts valid login with username', () => {
        const result = validateLogin({ username: 'coder_bob', password: 'secretpassword' });
        expect(result.emailOrUsername).toBe('coder_bob');
      });

      it('rejects missing credentials', () => {
        expect(() => validateLogin({})).toThrow(/Validation failed/);
        expect(() => validateLogin({ email: 'test@codearena.dev' })).toThrow(/Validation failed/);
        expect(() => validateLogin({ password: 'secretpassword' })).toThrow(/Validation failed/);
      });
    });
  });

  describe('problem.validator', () => {
    describe('validateProblemQuery', () => {
      it('validates pagination and difficulty bounds correctly', () => {
        const valid = validateProblemQuery({
          query: { page: '2', limit: '20', difficulty: 'Easy', topic: 'Arrays', search: 'Two Sum' }
        });
        expect(valid.isValid).toBe(true);

        const invalidPage = validateProblemQuery({ query: { page: '0' } });
        expect(invalidPage.isValid).toBe(false);

        const invalidLimit = validateProblemQuery({ query: { limit: '999' } });
        expect(invalidLimit.isValid).toBe(false);

        const invalidDifficulty = validateProblemQuery({ query: { difficulty: 'UltraHard' } });
        expect(invalidDifficulty.isValid).toBe(false);
      });
    });

    describe('validateProblemSlug', () => {
      it('enforces lowercase hyphenated slugs', () => {
        expect(validateProblemSlug({ params: { slug: 'two-sum-ii' } }).isValid).toBe(true);
        expect(validateProblemSlug({ params: { slug: 'two_sum' } }).isValid).toBe(false);
        expect(validateProblemSlug({ params: { slug: 'Two-Sum' } }).isValid).toBe(false);
        expect(validateProblemSlug({ params: { slug: '-two-sum' } }).isValid).toBe(false);
        expect(validateProblemSlug({ params: { slug: 'a' } }).isValid).toBe(false);
      });
    });

    describe('validateProblemPayload', () => {
      it('validates required fields, examples, and judge test cases', () => {
        const validProblem = {
          title: 'Valid Problem',
          slug: 'valid-problem',
          difficulty: 'Medium',
          description: 'A detailed problem description that meets minimum length.',
          topics: ['Dynamic Programming'],
          examples: [{ input: '1\n2', output: '3' }],
          judgeTestCases: [{ input: '1\n2', expectedOutput: '3', isHidden: false }]
        };

        const res = validateProblemPayload({ body: validProblem });
        expect(res.isValid).toBe(true);

        const invalidProblem = {
          title: '',
          difficulty: 'Extreme',
          description: 'short',
          topics: []
        };
        const failed = validateProblemPayload({ body: invalidProblem });
        expect(failed.isValid).toBe(false);
        expect(failed.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('submission.validator', () => {
    describe('validateSubmissionHistoryQuery', () => {
      it('validates history filters and date ranges', () => {
        const validReq = {
          query: {
            page: '1',
            limit: '15',
            status: 'Accepted',
            language: 'python',
            startDate: '2026-01-01T00:00:00Z',
            endDate: '2026-02-01T00:00:00Z'
          }
        };
        const valid = validateSubmissionHistoryQuery(validReq);
        expect(valid.isValid).toBe(true);

        const invalidDateOrder = {
          query: {
            startDate: '2026-03-01T00:00:00Z',
            endDate: '2026-01-01T00:00:00Z'
          }
        };
        const invalidOrder = validateSubmissionHistoryQuery(invalidDateOrder);
        expect(invalidOrder.isValid).toBe(false);
        expect(invalidOrder.errors[0].field).toBe('dateRange');

        const invalidStatus = validateSubmissionHistoryQuery({
          query: { status: 'AlmostPassed' }
        });
        expect(invalidStatus.isValid).toBe(false);
      });
    });
  });

  describe('user.validator', () => {
    describe('validateUpdateProfile', () => {
      it('enforces character length limits for profile fields', () => {
        expect(validateUpdateProfile({ body: { name: 'Alice', bio: 'Short bio' } }).isValid).toBe(true);
        expect(validateUpdateProfile({ body: { name: 'x'.repeat(61) } }).isValid).toBe(false);
        expect(validateUpdateProfile({ body: { bio: 'x'.repeat(501) } }).isValid).toBe(false);
        expect(validateUpdateProfile({ body: { targetRole: 'x'.repeat(101) } }).isValid).toBe(false);
      });
    });

    describe('validateProblemIdParam', () => {
      it('validates MongoDB ObjectId format', () => {
        expect(validateProblemIdParam({ params: { problemId: '507f1f77bcf86cd799439011' } }).isValid).toBe(true);
        expect(validateProblemIdParam({ params: { problemId: 'invalid-id-format' } }).isValid).toBe(false);
        expect(validateProblemIdParam({ params: { problemId: '' } }).isValid).toBe(false);
      });
    });

    describe('validateBookmarkQuery', () => {
      it('validates pagination bounds', () => {
        expect(validateBookmarkQuery({ query: { page: '1', limit: '10' } }).isValid).toBe(true);
        expect(validateBookmarkQuery({ query: { page: '-1' } }).isValid).toBe(false);
        expect(validateBookmarkQuery({ query: { limit: '100' } }).isValid).toBe(false);
      });
    });
  });
});
