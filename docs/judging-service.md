# CodeArena — Sandboxed Judging Service & Submission Workflow

This document details the configuration, security boundaries, output-comparison policy, and verification workflows for CodeArena's code execution engine powered by Judge0.

---

## 1. Architecture & Security Model

CodeArena enforces strict separation between user management/API serving and arbitrary untrusted code execution.

```
+-------------------------------------------------------------+
|                      Client Browser                         |
|  - Monaco Editor                                            |
|  - Starter code & language switcher                         |
|  - Run (sample tests) vs Submit (all tests)                 |
+------------------------------+------------------------------+
                               |
                   HTTPS (HTTP-only cookies + CSRF)
                               |
                               v
+-------------------------------------------------------------+
|                     CodeArena Express API                   |
|  - Auth & Role verification                                 |
|  - Submission rate limiting (20 req/min)                    |
|  - Source-code size validation (max 64 KB)                  |
|  - Fetch trusted testcases from MongoDB                     |
|  - Wrap code with harness for target language               |
|  - Output normalization & comparison policy                 |
|  - Idempotent problem stats & progress tracking             |
|                                                             |
|  * NEVER executes user code in Express Node.js process      |
|  * NEVER leaks hidden test inputs or expected outputs       |
+------------------------------+------------------------------+
                               |
                    Asynchronous REST API
                               |
                               v
+-------------------------------------------------------------+
|               Judge0 Sandboxed Execution Sandbox            |
|  - Isolated Linux cgroups container                         |
|  - Hard resource bounds:                                    |
|      * CPU time limit: 2.0 seconds                          |
|      * Wall-clock time limit: 5.0 seconds                   |
|      * Memory limit: 128 MB (131,072 KB)                    |
|      * Stack limit: 64 MB (65,536 KB)                       |
|      * Max processes / threads: 60                          |
|      * Network: disabled inside sandbox                     |
+-------------------------------------------------------------+
```

### Key Security Safeguards
1. **Isolated Execution**: User-submitted code is never executed inside the Express Node.js application process or host operating system.
2. **Resource Constraints**: Judge0 enforces strict CPU (2.0s), wall-clock (5.0s), and memory (128MB) limits per testcase.
3. **Hidden Testcase Sanitization**: Testcases marked as `isHidden: true` are stored in MongoDB. When judged, their results contain execution time, memory, and status, but their `input` and `expectedOutput` are strictly redacted from API responses.
4. **Backend-Only Credentials**: Judge0 API keys and endpoints reside strictly in server environment variables and are never forwarded or exposed to the client.
5. **No Fabricated Verdicts**: If the judging provider is unavailable or unconfigured, the system returns a clear `503 Service Unavailable` with error code `JUDGE_SERVICE_NOT_CONFIGURED`, refusing to fabricate mock `Accepted` verdicts.

---

## 2. Configuration & Environment Variables

### Environment Variables
Configure the following variables in `server/.env` (or root `.env` for monorepo development):

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `JUDGE0_API_URL` | **Yes** | — | Base URL of the Judge0 service (e.g. `https://judge0-ce.p.rapidapi.com` or `http://localhost:2358`) |
| `JUDGE0_API_KEY` | Optional | `""` | RapidAPI application key (required only when using RapidAPI) |
| `JUDGE0_API_HOST` | Optional | `judge0-ce.p.rapidapi.com` | RapidAPI host header (used when `JUDGE0_API_KEY` is present) |

---

### Option A: Hosted RapidAPI Judge0 (Cloud)

1. Register or sign in at [RapidAPI](https://rapidapi.com/).
2. Subscribe to the [Judge0 CE API](https://rapidapi.com/judge0-official/api/judge0-ce) (free tier allows 50 submissions/day).
3. Retrieve your RapidAPI Key (`X-RapidAPI-Key`).
4. Set the following in `server/.env`:
```env
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key_here
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

---

### Option B: Self-Hosted Judge0 CE (Local Docker)

For unlimited local submissions without external rate limits:

1. Clone the Judge0 repository or use docker-compose:
```bash
# Download judge0 configuration
curl -O https://raw.githubusercontent.com/judge0/judge0/master/docker-compose.yml
curl -O https://raw.githubusercontent.com/judge0/judge0/master/judge0.conf

# Start Judge0 CE (server + redis + postgres)
docker compose up -d
```
2. Verify that Judge0 is healthy:
```bash
curl http://localhost:2358/system_info
```
3. Set the following in `server/.env`:
```env
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=
JUDGE0_API_HOST=
```

---

## 3. Supported Languages & Language IDs

CodeArena maps language keys to official Judge0 Language IDs:

| Language Key | Judge0 ID | Compiler / Interpreter |
| :--- | :--- | :--- |
| `javascript` | `63` | Node.js 12.14.0+ |
| `python` | `71` | Python 3.8.1+ |
| `cpp` | `54` | GCC 9.2.0 (`-O2` optimization) |
| `java` | `62` | OpenJDK 13.0.1 |

Each language is paired with an execution wrapper harness that:
- Reads standard input JSON arguments.
- Executes the user's function or class solution.
- Serializes and prints the returned value to standard output.

---

## 4. Output Comparison Policy

The comparison policy ensures grading consistency across different operating systems, runtimes, and languages while strictly preventing false positives:

1. **Line Ending Normalization**: All CRLF (`\r\n`) line endings are converted to standard LF (`\n`).
2. **Trailing Whitespace Trimming**: Trailing whitespace is stripped from the end of each line, avoiding failures due to invisible spaces or differing newline terminations.
3. **Boundary Trimming**: Leading and trailing blank lines or spaces surrounding the entire output are removed.
4. **JSON Deep Structural Comparison**:
   - For outputs structured as JSON arrays (e.g. `[0, 1]`), objects (e.g. `{"count": 3}`), numbers, or booleans, CodeArena parses both actual and expected outputs and performs deep structural equality.
   - For example, `[0, 1]` is considered identical to `[ 0,  1 ]` or `[0,\n1]`.
5. **Semantic Internal Whitespace Preservation**:
   - For plain text or string outputs, interior whitespace (spaces between characters and words) is strictly preserved so that whitespace-sensitive problems are graded accurately.

---

## 5. Submission & Run Workflow

### Run Action (`POST /api/submissions/run`)
- Executes the code against the problem's public sample testcases only.
- Returns detailed inputs, expected outputs, and actual outputs for each sample.
- Does **not** persist a record in the database or affect problem solved counts.

### Submit Action (`POST /api/submissions`)
1. Validates authentication, payload size (<= 64KB), and language.
2. Checks user submission rate limit (20 req/minute).
3. Fetches all active testcases from the database (both samples and hidden).
4. Executes sequentially through testcases; aborts early on the first failing testcase to conserve execution resources.
5. Saves the final evaluated submission in MongoDB with:
   - Overall status: `Accepted`, `Wrong Answer`, `Time Limit Exceeded`, `Memory Limit Exceeded`, `Compilation Error`, or `Runtime Error`.
   - Aggregate execution time (max observed across passed testcases).
   - Peak memory usage.
   - Pass/fail testcase counts.
6. **Idempotent Progress Update**: If status is `Accepted`:
   - Checks if this is the user's first time solving the problem (`ProblemProgress.findOneAndUpdate` with upsert).
   - Only increments the problem's `stats.acceptedSubmissions` if it is a newly solved problem, ensuring statistics remain strictly accurate.
7. Hidden test inputs and expected outputs are removed from the client response.

---

## 6. Manual Verification Steps

To manually test the complete workspace and submission flow:

### Step 1: Start Server and Client
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run client
```

### Step 2: Unconfigured Provider Check
1. Start the server without setting `JUDGE0_API_URL`.
2. Open a problem workspace at `http://localhost:5173/problems/two-sum`.
3. Click **Run** or **Submit**.
4. **Expected Result**: A clear red diagnostic banner appears:
   *"Judging service is not configured. Please set JUDGE0_API_URL (and JUDGE0_API_KEY if using RapidAPI) in the server environment."* No fabricated Accepted verdict is shown.

### Step 3: Configured Provider (or Docker CE)
1. Add valid Judge0 credentials to `server/.env`.
2. Sign in as a registered user.
3. Open `Two Sum` and choose **JavaScript**:
   ```javascript
   function twoSum(nums, target) {
     const map = new Map();
     for (let i = 0; i < nums.length; i++) {
       const complement = target - nums[i];
       if (map.has(complement)) {
         return [map.get(complement), i];
       }
       map.set(nums[i], i);
     }
     return [];
   }
   ```
4. Click **Run**:
   - Verify the "Sample Results" tab activates.
   - Check that all sample cases show green `Passed` badges with execution time.
5. Click **Submit**:
   - Verify Run and Submit buttons become disabled with loading spinners.
   - Verify the "Submission Verdict" tab opens automatically with an `Accepted` banner.
   - Verify aggregate runtime (ms), memory (MB), and testcase summary (e.g. `5 / 5 Testcases Passed`).
6. Click the **Submissions** tab in the problem statement drawer:
   - Verify the new submission appears with green `Accepted` badge and timestamp.

### Step 4: Wrong Answer Verification
1. Change `return [map.get(complement), i];` to `return [0, 0];`.
2. Click **Submit**.
3. **Expected Result**: Verdict shows `Wrong Answer` with passed testcase count (e.g. `0 / 5`), while hidden testcase inputs remain confidential.

### Step 5: Syntax / Compilation Error Verification
1. Introduce a syntax error (e.g., `function twoSum(` without closing bracket).
2. Click **Run** or **Submit**.
3. **Expected Result**: Verdict displays `Compilation Error` or `Runtime Error` with sanitized compiler/interpreter diagnostics.
