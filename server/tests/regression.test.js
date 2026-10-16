import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Problem } from '../src/models/Problem.js';
import { Submission } from '../src/models/Submission.js';
import { signJwtToken, AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../src/utils/token.js';
import { setJudge0ConfigOverride } from '../src/config/env.js';

let mongod;
let testUser;
let authCookie;
let testProblem;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  testUser = await User.create({
    username: 'audit_tester',
    email: 'tester@codearena.dev',
    passwordHash: 'dummy_hash',
    role: 'user'
  });

  authCookie = `${AUTH_COOKIE_NAME}=${signJwtToken({ sub: testUser._id.toString(), role: 'user' })}`;

  testProblem = await Problem.create({
    title: 'Audit Regression Problem',
    slug: 'audit-regression-problem',
    difficulty: 'Medium',
    topics: ['Security'],
    description: 'Testing regression fixes.',
    constraints: ['1 <= n <= 100'],
    examples: [{ input: '10', output: '20' }],
    starterCode: { javascript: 'function solve(n) {}' },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '10', expectedOutput: '20', isHidden: false },
      { input: 'SECRET_HIDDEN_INPUT_999', expectedOutput: '40', isHidden: true }
    ]
  });
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

describe('Regression Tests: Audit Discovered Bugs & Edge Cases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setJudge0ConfigOverride(null);
  });

  describe('Bug Fix: Hidden Test Case Stderr Data Leakage', () => {
    it('STRICTLY suppresses stderr in safeErrorDetails when failure occurs on a hidden test case', async () => {
      let callIndex = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          // Public test case passes
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () =>
              Promise.resolve({
                status: { id: 3, description: 'Accepted' },
                stdout: '20'
              })
          });
        }
        // Hidden test case fails, and program dumped secret input / assertion on stderr
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              status: { id: 11, description: 'Runtime Error' },
              stderr: 'Exception in hidden evaluation: SECRET_HIDDEN_INPUT_999 failed at checkPrivateAssert()',
              stdout: ''
            })
        });
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', authCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function solve(n) { console.error("secret dump"); }'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Runtime Error');
      expect(res.body.data.testCaseCounts).toEqual({ passed: 1, total: 2 });

      // Regression verification:
      // The response must NEVER contain the stderr content from the hidden test case!
      const rawJson = JSON.stringify(res.body);
      expect(rawJson).not.toContain('SECRET_HIDDEN_INPUT_999');
      expect(rawJson).not.toContain('checkPrivateAssert');
      expect(res.body.data.safeErrorDetails).toBe('Failed on hidden test case #2');
    });

    it('allows stderr in safeErrorDetails when failure occurs on a public/sample test case for debugging', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            status: { id: 11, description: 'Runtime Error' },
            stderr: 'ReferenceError: variableNotDefined is not defined',
            stdout: ''
          })
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', authCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function solve(n) { variableNotDefined(); }'
        })
        .expect(201);

      expect(res.body.data.status).toBe('Runtime Error');
      // On public test case #1, safeErrorDetails can show stderr to assist developer
      expect(res.body.data.safeErrorDetails).toContain('ReferenceError');
    });
  });

  describe('Bug Fix: CSRF Protection Cookie Consistency', () => {
    it('blocks state mutation when AUTH_COOKIE_NAME is present without CSRF validation', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie) // has session cookie, no csrf header or ajax header
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('allows state mutation when valid double-submit CSRF token is provided', async () => {
      const mockCsrfToken = 'mock_csrf_secret_token_12345';
      const cookies = [
        authCookie,
        `${CSRF_COOKIE_NAME}=${mockCsrfToken}`
      ].join('; ');

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', mockCsrfToken)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Bug Fix: Judge0 Status 4 Output Normalization Rescue', () => {
    it('accepts submission when Judge0 reports status 4 (raw diff failure) but CodeArena comparison policy validates semantic equivalence', async () => {
      // Mock Judge0 returning status 4 for both testcases, but with stdout matching expectedOutput semantically
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              status: { id: 4, description: 'Wrong Answer' },
              stdout: '20\r\n', // Extra Windows line ending or trailing space causing raw diff mismatch
              time: '0.030'
            })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              status: { id: 4, description: 'Wrong Answer' },
              stdout: '40 \n', // Trailing whitespace
              time: '0.032'
            })
        });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', authCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function solve(n) { return n * 2; }'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Accepted');
      expect(res.body.data.testCaseCounts).toEqual({ passed: 2, total: 2 });
    });
  });
});
