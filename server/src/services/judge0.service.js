import { env } from '../config/env.js';
import { AppError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { compareOutputs } from '../utils/outputComparator.js';

export const JUDGE0_LANGUAGES = Object.freeze({
  javascript: { id: 63, name: 'JavaScript (Node.js 12.14.0)' },
  python: { id: 71, name: 'Python (3.8.1)' },
  cpp: { id: 54, name: 'C++ (GCC 9.2.0)' },
  java: { id: 62, name: 'Java (OpenJDK 13.0.1)' }
});

const DEFAULT_SANDBOX_LIMITS = Object.freeze({
  cpu_time_limit: 2.0, // seconds
  memory_limit: 128000, // 128 MB in KB
  wall_time_limit: 5.0 // seconds
});

/**
 * Generate execution wrapper harness around user solution.
 * Allows LeetCode-style functions and competitive programming standard input.
 */
export function wrapCodeForExecution(sourceCode, language) {
  const code = (sourceCode || '').trim();

  if (language === 'javascript') {
    // If user already implements custom stdin or main driver, leave untouched
    if (code.includes('readline') || code.includes('process.stdin') || code.includes('fs.readFileSync')) {
      return code;
    }

    // Detect function name: function <name>(...
    const funcMatch = code.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
    const fnName = funcMatch ? funcMatch[1] : null;

    if (!fnName) {
      return code;
    }

    return `${code}

// --- CodeArena Execution Driver ---
const fs = require('fs');
try {
  const rawInput = fs.readFileSync(0, 'utf-8').trim();
  if (rawInput) {
    const lines = rawInput.split('\\n').map(l => l.trim()).filter(Boolean);
    const parsedArgs = lines.map(l => {
      try {
        return JSON.parse(l);
      } catch (e) {
        return l;
      }
    });
    const result = ${fnName}(...parsedArgs);
    console.log(JSON.stringify(result));
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}`;
  }

  if (language === 'python') {
    if (code.includes('sys.stdin') || code.includes('input(')) {
      return code;
    }

    // Detect Solution method: def <methodName>(self, ...
    const methodMatch = code.match(/def\s+([a-zA-Z0-9_]+)\s*\(\s*self\s*[,)]/);
    const methodName = methodMatch ? methodMatch[1] : null;

    if (!methodName) {
      return code;
    }

    return `${code}

# --- CodeArena Execution Driver ---
import sys, json

def _codearena_driver():
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        return
    lines = [l.strip() for l in raw_input.split('\\n') if l.strip()]
    args = []
    for line in lines:
        try:
            args.append(json.loads(line))
        except Exception:
            args.append(line)
    
    sol = Solution()
    res = getattr(sol, '${methodName}')(*args)
    if isinstance(res, bool):
        print('true' if res else 'false')
    else:
        print(json.dumps(res))

if __name__ == '__main__':
    _codearena_driver()`;
  }

  return code;
}

/**
 * Poll Judge0 submission token until completion or timeout
 */
async function pollSubmissionResult(token, headers, baseUrl) {
  const maxAttempts = 12;
  const pollIntervalMs = 400;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const pollRes = await fetch(`${baseUrl}/submissions/${token}?base64_encoded=false`, {
      method: 'GET',
      headers
    });

    if (!pollRes.ok) {
      throw new Error(`Judge0 poll failed with HTTP status ${pollRes.status}`);
    }

    const data = await pollRes.json();
    // Status ID: 1 = In Queue, 2 = Processing
    if (data.status && data.status.id > 2) {
      return data;
    }
  }

  throw new Error('Judge0 execution polling timed out');
}

/**
 * Executes a single test case through the configured Judge0 sandboxed environment.
 *
 * @param {object} params
 * @param {string} params.sourceCode
 * @param {'javascript' | 'python' | 'cpp' | 'java'} params.language
 * @param {string} params.stdin
 * @param {string} params.expectedOutput
 * @returns {Promise<{
 *   passed: boolean,
 *   status: string,
 *   stdout: string,
 *   stderr: string,
 *   compileOutput: string,
 *   timeMs: number,
 *   memoryKb: number
 * }>}
 */
export async function executeJudgeTestCase({
  sourceCode,
  language,
  stdin,
  expectedOutput
}) {
  // Guard: strictly enforce external judging service configuration check
  if (!env.isJudge0Configured()) {
    throw new AppError(
      'Judging service is not configured. Please set JUDGE0_API_URL (and JUDGE0_API_KEY if using RapidAPI) in the server environment.',
      503,
      'JUDGE_SERVICE_NOT_CONFIGURED'
    );
  }

  const langConfig = JUDGE0_LANGUAGES[language];
  if (!langConfig) {
    throw new AppError(
      `Unsupported language: ${language}. Supported languages: ${Object.keys(JUDGE0_LANGUAGES).join(', ')}`,
      400,
      'INVALID_LANGUAGE'
    );
  }

  const wrappedCode = wrapCodeForExecution(sourceCode, language);
  const baseUrl = (env.JUDGE0_API_URL || '').replace(/\/+$/, '');

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  if (env.JUDGE0_API_KEY) {
    if (env.JUDGE0_API_HOST) {
      headers['X-RapidAPI-Key'] = env.JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = env.JUDGE0_API_HOST;
    } else {
      headers['X-Auth-Token'] = env.JUDGE0_API_KEY;
    }
  }

  const payload = {
    source_code: wrappedCode,
    language_id: langConfig.id,
    stdin: stdin || '',
    expected_output: expectedOutput || null,
    cpu_time_limit: DEFAULT_SANDBOX_LIMITS.cpu_time_limit,
    memory_limit: DEFAULT_SANDBOX_LIMITS.memory_limit,
    wall_time_limit: DEFAULT_SANDBOX_LIMITS.wall_time_limit
  };

  let judgeData;
  try {
    const response = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error('Judge0 provider returned error response', {
        status: response.status,
        response: errText
      });
      throw new AppError(
        `External judging provider returned status ${response.status}`,
        503,
        'JUDGE_PROVIDER_ERROR'
      );
    }

    judgeData = await response.json();

    // If result was asynchronous / still processing, poll token
    if (judgeData.status && judgeData.status.id <= 2 && judgeData.token) {
      judgeData = await pollSubmissionResult(judgeData.token, headers, baseUrl);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to communicate with Judge0 execution sandbox', { error: error.message });
    throw new AppError(
      `Judging service temporarily unavailable: ${error.message}`,
      503,
      'JUDGE_SERVICE_UNAVAILABLE'
    );
  }

  // Parse Judge0 Status Codes
  const statusId = judgeData.status?.id;
  const stdout = judgeData.stdout || '';
  const stderr = judgeData.stderr || '';
  const compileOutput = judgeData.compile_output || '';
  const timeMs = judgeData.time ? Math.round(Number.parseFloat(judgeData.time) * 1000) : 0;
  const memoryKb = judgeData.memory ? Number.parseInt(judgeData.memory, 10) : 0;

  let finalStatus;
  let passed = false;

  switch (statusId) {
    case 3: // Accepted by Judge0 execution
<<<<<<< HEAD
    case 4: // Wrong Answer by Judge0 raw byte comparison
      // Double check against defined output comparison policy (handles JSON structures, whitespace, floats, booleans)
      passed = compareOutputs(stdout, expectedOutput);
      finalStatus = passed ? 'Accepted' : 'Wrong Answer';
      break;
=======
      // Double check against defined output comparison policy
      passed = compareOutputs(stdout, expectedOutput);
      finalStatus = passed ? 'Accepted' : 'Wrong Answer';
      break;
    case 4:
      finalStatus = 'Wrong Answer';
      passed = false;
      break;
>>>>>>> 5ebb99200719df0c6697138cb1a3da781b3a59e1
    case 5:
      finalStatus = 'Time Limit Exceeded';
      passed = false;
      break;
    case 6:
      finalStatus = 'Compilation Error';
      passed = false;
      break;
    case 7: // SIGSEGV
    case 8: // SIGXFSZ
    case 9: // SIGFPE
    case 10: // SIGABRT
    case 11: // NZEC
    case 12: // Other Runtime Error
    case 13: // Internal Error
    case 14: // Exec Format Error
      finalStatus = 'Runtime Error';
      passed = false;
      break;
    default:
      finalStatus = 'Runtime Error';
      passed = false;
  }

  return {
    passed,
    status: finalStatus,
    stdout,
    stderr,
    compileOutput,
    timeMs,
    memoryKb
  };
}
