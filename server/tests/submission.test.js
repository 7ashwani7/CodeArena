import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Problem } from '../src/models/Problem.js';
import { Submission } from '../src/models/Submission.js';
import { ProblemProgress } from '../src/models/ProblemProgress.js';
import { signJwtToken, AUTH_COOKIE_NAME } from '../src/utils/token.js';
import { env, setJudge0ConfigOverride } from '../src/config/env.js';
import { compareOutputs } from '../src/utils/outputComparator.js';

let mongod;
let regularUser;
let otherUser;
let adminUser;
let regularAuthCookie;
let otherAuthCookie;
let adminAuthCookie;
let testProblem;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Create users
  regularUser = await User.create({
    username: 'coder_alice',
    email: 'alice@codearena.dev',
    passwordHash: 'argon2id_mock_hash',
    role: 'user'
  });

  otherUser = await User.create({
    username: 'coder_bob',
    email: 'bob@codearena.dev',
    passwordHash: 'argon2id_mock_hash',
    role: 'user'
  });

  adminUser = await User.create({
    username: 'admin_eve',
    email: 'admin@codearena.dev',
    passwordHash: 'argon2id_mock_hash',
    role: 'admin'
  });

  regularAuthCookie = `${AUTH_COOKIE_NAME}=${signJwtToken({ sub: regularUser._id.toString(), role: 'user' })}`;
  otherAuthCookie = `${AUTH_COOKIE_NAME}=${signJwtToken({ sub: otherUser._id.toString(), role: 'user' })}`;
  adminAuthCookie = `${AUTH_COOKIE_NAME}=${signJwtToken({ sub: adminUser._id.toString(), role: 'admin' })}`;

  // Create test problem with public examples and private hidden test cases
  testProblem = await Problem.create({
    title: 'Two Sum Judged',
    slug: 'two-sum-judged',
    difficulty: 'Easy',
    topics: ['Arrays & Hashing'],
    description: 'Find two indices summing to target.',
    constraints: ['2 <= nums.length <= 10^4'],
    examples: [
      { input: '[2,7,11,15]\n9', output: '[0,1]', explanation: '2 + 7 = 9' }
    ],
    starterCode: {
      javascript: 'function twoSum(nums, target) {}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false },
      { input: '[-1,-2,-3,-4,-5]\n-8', expectedOutput: '[2,4]', isHidden: true },
      { input: '[1000000000,-1000000000]\n0', expectedOutput: '[0,1]', isHidden: true }
    ]
  });
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

describe('Secure Code Submission & Judge0 Integration Workflow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Output Comparison Policy Unit Tests', () => {
    it('normalizes CRLF line endings to LF correctly', () => {
      expect(compareOutputs('hello\r\nworld\r\n', 'hello\nworld')).toBe(true);
      expect(compareOutputs('line1\r\nline2', 'line1\r\nline2\r\n')).toBe(true);
    });

    it('trims trailing whitespaces per line while preserving internal indentation', () => {
      expect(compareOutputs('abc   \ndef   ', 'abc\ndef')).toBe(true);
      expect(compareOutputs('  indented line  ', '  indented line')).toBe(true);
      // Fails when internal spaces differ
      expect(compareOutputs('a   b', 'a b')).toBe(false);
    });

    it('matches JSON array and object structures regardless of formatting spacing', () => {
      expect(compareOutputs('[0, 1]', '[0,1]')).toBe(true);
      expect(compareOutputs('[\n  0,\n  1\n]', '[0, 1]')).toBe(true);
      expect(compareOutputs('{"a": 1, "b": 2}', '{"b": 2, "a": 1}')).toBe(true);
    });

    it('matches boolean representations case-insensitively', () => {
      expect(compareOutputs('true\n', 'true')).toBe(true);
      expect(compareOutputs('True', 'true')).toBe(true);
      expect(compareOutputs('false', 'False')).toBe(true);
      expect(compareOutputs('true', 'false')).toBe(false);
    });
  });

  describe('Authentication & Input Validation', () => {
    it('rejects unauthenticated submission request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function twoSum() { return [0, 1]; }'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects unsupported programming language with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'rust_unsupported',
          sourceCode: 'fn main() {}'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_LANGUAGE');
    });

    it('rejects empty or whitespace-only source code', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: '   '
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMPTY_SOURCE_CODE');
    });

    it('rejects oversized source code exceeding 64KB', async () => {
      const oversizedCode = 'x'.repeat(66000);
      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: oversizedCode
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SOURCE_CODE_TOO_LARGE');
    });

    it('rejects non-existent problem ID with 404 Not Found', async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: randomId,
          language: 'javascript',
          sourceCode: 'function twoSum() {}'
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PROBLEM_NOT_FOUND');
    });
  });

  describe('Sandboxed Code Execution & Judge0 Verdicts', () => {
    it('handles Accepted submission when all test cases pass and updates progress idempotently', async () => {
      // Mock Judge0 responses: 4 test cases all return Accepted (status id 3)
      globalThis.fetch = vi.fn().mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        let expectedOut = '[0,1]';
        if (body.stdin.includes('[3,2,4]')) expectedOut = '[1,2]';
        if (body.stdin.includes('[-1,-2,-3,-4,-5]')) expectedOut = '[2,4]';

        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              status: { id: 3, description: 'Accepted' },
              stdout: expectedOut,
              stderr: '',
              compile_output: '',
              time: '0.045',
              memory: '41200'
            })
        });
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function twoSum(nums, target) { return [0, 1]; }'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Accepted');
      expect(res.body.data.testCaseCounts).toEqual({ passed: 4, total: 4 });
      expect(res.body.data.executionTimeMs).toBeGreaterThan(0);

      // Verify ProblemProgress in database
      const progress = await ProblemProgress.findOne({
        userId: regularUser._id,
        problemId: testProblem._id
      });
      expect(progress).not.toBeNull();
      expect(progress.status).toBe('Solved');
      expect(progress.solvedAt).toBeInstanceOf(Date);
      expect(progress.attemptsCount).toBe(1);

      // Verify Problem stats
      const updatedProblem = await Problem.findById(testProblem._id);
      expect(updatedProblem.acceptedCount).toBe(1);
      expect(updatedProblem.submissionCount).toBe(1);

      // Idempotency: submit again as Accepted, acceptedCount must not double
      await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function twoSum() { return [0, 1]; }'
        })
        .expect(201);

      const afterSecondSubmit = await Problem.findById(testProblem._id);
      expect(afterSecondSubmit.acceptedCount).toBe(1); // Still 1, not incremented again
      expect(afterSecondSubmit.submissionCount).toBe(2);

      const updatedProgress = await ProblemProgress.findOne({
        userId: regularUser._id,
        problemId: testProblem._id
      });
      expect(updatedProgress.attemptsCount).toBe(2);
    });

    it('handles Wrong Answer verdict and stops on first failed testcase', async () => {
      // Mock Judge0: test case 1 passes, test case 2 fails
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () =>
              Promise.resolve({
                status: { id: 3, description: 'Accepted' },
                stdout: '[0,1]',
                stderr: '',
                time: '0.040',
                memory: '40000'
              })
          });
        }
        // Test case 2 returns wrong answer
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              status: { id: 4, description: 'Wrong Answer' },
              stdout: '[99,99]',
              stderr: '',
              time: '0.040',
              memory: '40000'
            })
        });
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', otherAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function twoSum() { return [99, 99]; }'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Wrong Answer');
      expect(res.body.data.testCaseCounts.passed).toBe(1);
      expect(callCount).toBe(2); // Stopped at testcase 2, did not execute cases 3 and 4

      // Verify otherUser progress is Attempted (not Solved)
      const bobProgress = await ProblemProgress.findOne({
        userId: otherUser._id,
        problemId: testProblem._id
      });
      expect(bobProgress.status).toBe('Attempted');
    });

    it('protects hidden test cases: NEVER leaks inputs or expected outputs in API response', async () => {
      // Mock Judge0: passes case 1 and 2, fails on hidden case 3
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () =>
              Promise.resolve({
                status: { id: 3, description: 'Accepted' },
                stdout: callCount === 1 ? '[0,1]' : '[1,2]',
                time: '0.035'
              })
          });
        }
        // Case 3 (hidden) fails
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              status: { id: 4, description: 'Wrong Answer' },
              stdout: 'wrong output',
              time: '0.035'
            })
        });
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function twoSum() {}'
        })
        .expect(201);

      const data = res.body.data;
      expect(data.status).toBe('Wrong Answer');
      expect(data.testCaseCounts.passed).toBe(2);

      // Critical Security Check: Ensure hidden test inputs and expected outputs are not present anywhere in response
      const resJson = JSON.stringify(res.body);
      expect(resJson).not.toContain('[-1,-2,-3,-4,-5]'); // Hidden test input
      expect(resJson).not.toContain('[1000000000,-1000000000]'); // Hidden test input 2
      expect(data.safeErrorDetails).toBe('Failed on hidden test case #3');
    });

    it('handles Compilation Error verdict safely', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            status: { id: 6, description: 'Compilation Error' },
            compile_output: 'syntax error: unexpected token { at line 4',
            stdout: '',
            stderr: ''
          })
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'cpp',
          sourceCode: 'class Solution { invalid cpp syntax'
        })
        .expect(201);

      expect(res.body.data.status).toBe('Compilation Error');
      expect(res.body.data.safeErrorDetails).toContain('syntax error');
    });

    it('handles Time Limit Exceeded verdict', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            status: { id: 5, description: 'Time Limit Exceeded' },
            stdout: '',
            stderr: '',
            time: '2.001'
          })
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'python',
          sourceCode: 'class Solution:\n    def twoSum(self, nums, target):\n        while True: pass'
        })
        .expect(201);

      expect(res.body.data.status).toBe('Time Limit Exceeded');
    });

    it('handles Runtime Error verdict', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            status: { id: 11, description: 'Runtime Error (NZEC)' },
            stderr: 'IndexError: list index out of range',
            stdout: ''
          })
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'python',
          sourceCode: 'class Solution:\n    def twoSum(self, nums, target):\n        return nums[99999]'
        })
        .expect(201);

      expect(res.body.data.status).toBe('Runtime Error');
    });

    it('handles Judge0 provider failures with 503 Service Unavailable', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: () => Promise.resolve('Bad Gateway upstream')
      });

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function twoSum() {}'
        })
        .expect(503);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('JUDGE_PROVIDER_ERROR');
    });

    it('displays configuration error if judging service is not configured (never fabricates Accepted)', async () => {
      setJudge0ConfigOverride(false);

      try {
        const res = await request(app)
          .post('/api/submissions')
          .set('Cookie', regularAuthCookie)
          .set('X-Requested-With', 'XMLHttpRequest')
          .send({
            problemId: testProblem._id.toString(),
            language: 'javascript',
            sourceCode: 'function twoSum() { return [0, 1]; }'
          })
          .expect(503);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('JUDGE_SERVICE_NOT_CONFIGURED');
        expect(res.body.error.message).toContain('Judging service is not configured');
      } finally {
        setJudge0ConfigOverride(null);
      }
    });
  });

  describe('Run Code Endpoint (POST /api/submissions/run)', () => {
    it('executes sample cases and returns actual output without persisting submission', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            status: { id: 3, description: 'Accepted' },
            stdout: '[0,1]',
            time: '0.042'
          })
      });

      const countBefore = await Submission.countDocuments();

      const res = await request(app)
        .post('/api/submissions/run')
        .set('Cookie', regularAuthCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          problemId: testProblem._id.toString(),
          language: 'javascript',
          sourceCode: 'function twoSum(nums, target) { return [0, 1]; }'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Accepted');
      expect(Array.isArray(res.body.data.testCases)).toBe(true);
      expect(res.body.data.testCases[0]).toHaveProperty('actualOutput', '[0,1]');
      expect(res.body.data.testCases[0]).toHaveProperty('passed', true);

      // Verify no permanent submission was persisted
      const countAfter = await Submission.countDocuments();
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('Submission History & Private Authorization', () => {
    let aliceSubmissionId;

    beforeAll(async () => {
      const sub = await Submission.create({
        userId: regularUser._id,
        problemId: testProblem._id,
        language: 'javascript',
        sourceCode: 'function twoSum() {}',
        status: 'Accepted',
        testCaseCounts: { passed: 4, total: 4 },
        executionTimeMs: 44
      });
      aliceSubmissionId = sub._id.toString();
    });

    it('allows user to retrieve their submission history via GET /api/submissions/me', async () => {
      const res = await request(app)
        .get('/api/submissions/me')
        .set('Cookie', regularAuthCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('problemId');
      expect(res.body.meta).toHaveProperty('totalItems');
    });

    it('allows user to retrieve their submission by ID', async () => {
      const res = await request(app)
        .get(`/api/submissions/${aliceSubmissionId}`)
        .set('Cookie', regularAuthCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(aliceSubmissionId);
    });

    it('forbids another user from viewing private submission history (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/submissions/${aliceSubmissionId}`)
        .set('Cookie', otherAuthCookie) // Bob trying to view Alice's submission
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows admin user to view any submission by ID', async () => {
      const res = await request(app)
        .get(`/api/submissions/${aliceSubmissionId}`)
        .set('Cookie', adminAuthCookie) // Admin viewing Alice's submission
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(aliceSubmissionId);
    });
  });
});
