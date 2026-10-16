import { test, expect } from '@playwright/test';

test.describe('E2E Flow 4 & 8: Workspace Submission, Judging & Timeout/Failure Handling', () => {
  const mockProblem = {
    _id: 'prob_123',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    topics: ['Arrays & Hashing'],
    description: 'Find two indices summing to target.',
    constraints: ['2 <= nums.length <= 10^4'],
    examples: [
      { input: '[2,7,11,15]\n9', output: '[0,1]', explanation: '2 + 7 = 9' }
    ],
    starterCode: {
      javascript: 'function twoSum(nums, target) { return [0, 1]; }'
    }
  };

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'healthy', database: 'connected' })
      });
    });

    // Authenticated user
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { _id: 'u_alice', username: 'alice', role: 'user' }
          }
        })
      });
    });

    await page.route('**/api/problems/two-sum', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockProblem })
      });
    });

    await page.route('**/api/submissions/me*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });
  });

  test('Flow 4: Submit code and receive Accepted verdict', async ({ page }) => {
    await page.route('**/api/submissions', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            _id: 'sub_acc_1',
            status: 'Accepted',
            language: 'javascript',
            executionTimeMs: 45,
            memoryUsageKb: 39000,
            testCaseCounts: { passed: 4, total: 4 },
            safeErrorDetails: null,
            createdAt: new Date().toISOString()
          }
        })
      });
    });

    await page.goto('/problems/two-sum');

    // Verify workspace loaded
    await expect(page.getByRole('heading', { name: 'Two Sum' })).toBeVisible();

    // Click Submit button
    const submitBtn = page.getByRole('button', { name: 'Submit', exact: true });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify Accepted verdict displayed in drawer
    await expect(page.getByText('Submission Result (Accepted)')).toBeVisible();
    await expect(page.getByText(/4 \/ 4 test cases passed/i)).toBeVisible();
    await expect(page.getByText('45 ms')).toBeVisible();
  });

  test('Flow 8: Handle Judge0 network failure and timeouts gracefully', async ({ page }) => {
    // Mock network failure / 503 service unavailable
    await page.route('**/api/submissions', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'JUDGE_SERVICE_UNAVAILABLE',
            message: 'Judging service temporarily unavailable: Judge0 execution polling timed out'
          }
        })
      });
    });

    await page.goto('/problems/two-sum');

    // Click Submit
    const submitBtn = page.getByRole('button', { name: 'Submit', exact: true });
    await submitBtn.click();

    // Verify error toast/message is displayed to user and UI remains interactive
    await expect(page.getByText(/judging service temporarily unavailable|polling timed out/i)).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});
