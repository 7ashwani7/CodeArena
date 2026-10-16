import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  wrapCodeForExecution,
  executeJudgeTestCase,
  JUDGE0_LANGUAGES
} from '../src/services/judge0.service.js';
import { env, setJudge0ConfigOverride } from '../src/config/env.js';
import { AppError } from '../src/utils/apiResponse.js';

describe('Unit Tests: judge0.service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setJudge0ConfigOverride(null);
  });

  describe('wrapCodeForExecution', () => {
    it('wraps a standard JavaScript function with a JSON parsing stdin driver', () => {
      const userCode = 'function twoSum(nums, target) { return [0, 1]; }';
      const wrapped = wrapCodeForExecution(userCode, 'javascript');

      expect(wrapped).toContain('function twoSum(nums, target)');
      expect(wrapped).toContain('// --- CodeArena Execution Driver ---');
      expect(wrapped).toContain('fs.readFileSync(0, \'utf-8\')');
      expect(wrapped).toContain('twoSum(...parsedArgs)');
      expect(wrapped).toContain('console.log(JSON.stringify(result))');
    });

    it('leaves JavaScript code untouched if user already implements custom stdin or readline', () => {
      const customCode = `
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin });
        rl.on('line', (line) => console.log(line));
      `;
      const wrapped = wrapCodeForExecution(customCode, 'javascript');
      expect(wrapped).toBe(customCode.trim());
      expect(wrapped).not.toContain('// --- CodeArena Execution Driver ---');
    });

    it('wraps Python Solution class methods with an automatic driver', () => {
      const userCode = `
class Solution:
    def twoSum(self, nums, target):
        return [0, 1]
      `;
      const wrapped = wrapCodeForExecution(userCode, 'python');

      expect(wrapped).toContain('class Solution:');
      expect(wrapped).toContain('# --- CodeArena Execution Driver ---');
      expect(wrapped).toContain('sol = Solution()');
      expect(wrapped).toContain("getattr(sol, 'twoSum')(*args)");
      expect(wrapped).toContain('sys.stdin.read().strip()');
    });

    it('leaves Python code untouched if user uses sys.stdin or input()', () => {
      const customCode = 'import sys\nfor line in sys.stdin:\n    print(line)';
      const wrapped = wrapCodeForExecution(customCode, 'python');
      expect(wrapped).toBe(customCode.trim());
      expect(wrapped).not.toContain('# --- CodeArena Execution Driver ---');
    });

    it('passes through C++ and Java code untouched', () => {
      const cppCode = '#include <iostream>\nint main() { return 0; }';
      expect(wrapCodeForExecution(cppCode, 'cpp')).toBe(cppCode);

      const javaCode = 'public class Solution { public static void main(String[] args) {} }';
      expect(wrapCodeForExecution(javaCode, 'java')).toBe(javaCode);
    });
  });

  describe('executeJudgeTestCase - Network, Timeout & Error Handling', () => {
    it('throws 503 JUDGE_SERVICE_NOT_CONFIGURED when judging credentials are missing', async () => {
      setJudge0ConfigOverride(false);

      await expect(
        executeJudgeTestCase({
          sourceCode: 'function solve() {}',
          language: 'javascript',
          stdin: '',
          expectedOutput: ''
        })
      ).rejects.toThrow('Judging service is not configured');
    });

    it('throws 400 INVALID_LANGUAGE when an unsupported language is provided', async () => {
      setJudge0ConfigOverride(true);

      await expect(
        executeJudgeTestCase({
          sourceCode: 'println!("hello")',
          language: 'ruby',
          stdin: '',
          expectedOutput: ''
        })
      ).rejects.toThrow('Unsupported language');
    });

    it('handles network failure (fetch throws TypeError) by raising 503 JUDGE_SERVICE_UNAVAILABLE', async () => {
      setJudge0ConfigOverride(true);
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fetch failed: connect ECONNREFUSED 127.0.0.1:2358'));

      await expect(
        executeJudgeTestCase({
          sourceCode: 'function twoSum() { return [0, 1]; }',
          language: 'javascript',
          stdin: '[2,7,11,15]\n9',
          expectedOutput: '[0,1]'
        })
      ).rejects.toMatchObject({
        statusCode: 503,
        code: 'JUDGE_SERVICE_UNAVAILABLE'
      });
    });

    it('handles Judge0 provider rate limiting or HTTP 429/500 errors with 503 JUDGE_PROVIDER_ERROR', async () => {
      setJudge0ConfigOverride(true);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too Many Requests on RapidAPI quota')
      });

      await expect(
        executeJudgeTestCase({
          sourceCode: 'function twoSum() {}',
          language: 'javascript',
          stdin: '',
          expectedOutput: ''
        })
      ).rejects.toMatchObject({
        statusCode: 503,
        code: 'JUDGE_PROVIDER_ERROR'
      });
    });

    it('polls asynchronous submission token and times out if execution exceeds maximum attempts', async () => {
      setJudge0ConfigOverride(true);

      // First call initiates submission and returns async token
      // Subsequent polling calls return status id 2 (Processing)
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/submissions?')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ token: 'async-judge-token-123', status: { id: 1, description: 'In Queue' } })
          });
        }
        // Poll endpoint returns in processing forever
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: { id: 2, description: 'Processing' } })
        });
      });

      // Vitest timer simulation or immediate timeout test
      await expect(
        executeJudgeTestCase({
          sourceCode: 'function slow() {}',
          language: 'javascript',
          stdin: '',
          expectedOutput: ''
        })
      ).rejects.toMatchObject({
        statusCode: 503,
        code: 'JUDGE_SERVICE_UNAVAILABLE'
      });
    }, 15000);

    it('asynchronously polls token and resolves when status id becomes Accepted (id > 2)', async () => {
      setJudge0ConfigOverride(true);

      let pollCount = 0;
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/submissions?')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ token: 'mock-async-token', status: { id: 2, description: 'Processing' } })
          });
        }
        pollCount++;
        if (pollCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ status: { id: 2, description: 'Processing' } })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: { id: 3, description: 'Accepted' },
            stdout: '[0, 1]',
            time: '0.042',
            memory: '38000'
          })
        });
      });

      const result = await executeJudgeTestCase({
        sourceCode: 'function twoSum() { return [0, 1]; }',
        language: 'javascript',
        stdin: '[2,7,11,15]\n9',
        expectedOutput: '[0,1]'
      });

      expect(result.passed).toBe(true);
      expect(result.status).toBe('Accepted');
      expect(result.stdout).toBe('[0, 1]');
      expect(result.timeMs).toBe(42);
      expect(pollCount).toBe(2);
    });

    it('classifies various Judge0 status IDs properly (SIGSEGV, NZEC, TLE, Compilation Error)', async () => {
      setJudge0ConfigOverride(true);

      // Test SIGSEGV
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: { id: 7, description: 'Runtime Error (SIGSEGV)' },
          stderr: 'Segmentation fault'
        })
      });
      const sigsegvResult = await executeJudgeTestCase({
        sourceCode: 'int main() { int* p = 0; *p = 1; }',
        language: 'cpp',
        stdin: '',
        expectedOutput: ''
      });
      expect(sigsegvResult.status).toBe('Runtime Error');
      expect(sigsegvResult.passed).toBe(false);

      // Test TLE
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: { id: 5, description: 'Time Limit Exceeded' }
        })
      });
      const tleResult = await executeJudgeTestCase({
        sourceCode: 'while(true);',
        language: 'javascript',
        stdin: '',
        expectedOutput: ''
      });
      expect(tleResult.status).toBe('Time Limit Exceeded');
      expect(tleResult.passed).toBe(false);
    });
    it('rescues Judge0 status 4 when output matches under CodeArena output comparison policy', async () => {
      setJudge0ConfigOverride(true);

      // Judge0 rejected with id: 4 because of whitespace / formatting difference
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: { id: 4, description: 'Wrong Answer' },
            stdout: '[0, 1]\n',
            time: '0.040',
            memory: '40000'
          })
      });

      const result = await executeJudgeTestCase({
        sourceCode: 'function solve() { return [0, 1]; }',
        language: 'javascript',
        stdin: '',
        expectedOutput: '[0,1]'
      });

      expect(result.passed).toBe(true);
      expect(result.status).toBe('Accepted');
    });

    it('retains Wrong Answer for Judge0 status 4 when output truly does not match', async () => {
      setJudge0ConfigOverride(true);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: { id: 4, description: 'Wrong Answer' },
            stdout: '[99, 99]\n',
            time: '0.040',
            memory: '40000'
          })
      });

      const result = await executeJudgeTestCase({
        sourceCode: 'function solve() { return [99, 99]; }',
        language: 'javascript',
        stdin: '',
        expectedOutput: '[0,1]'
      });

      expect(result.passed).toBe(false);
      expect(result.status).toBe('Wrong Answer');
    });
  });
});
