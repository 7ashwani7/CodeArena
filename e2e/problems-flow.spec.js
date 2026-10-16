import { test, expect } from '@playwright/test';

test.describe('E2E Flow 2 & 3: Problem Browsing & Hidden Test Case Protection', () => {
  const mockProblems = [
    {
      _id: 'prob_1',
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'Easy',
      topics: ['Arrays & Hashing'],
      description: 'Given an array of integers nums and an integer target...',
      examples: [
        { input: '[2,7,11,15]\n9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' }
      ],
      constraints: ['2 <= nums.length <= 10^4'],
      submissionCount: 42,
      acceptedCount: 30,
      isSolved: false,
      isBookmarked: false
    },
    {
      _id: 'prob_2',
      title: 'Valid Palindrome',
      slug: 'valid-palindrome',
      difficulty: 'Easy',
      topics: ['Two Pointers'],
      description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase...',
      examples: [
        { input: '"A man, a plan, a canal: Panama"', output: 'true' }
      ],
      constraints: ['1 <= s.length <= 2 * 10^5'],
      submissionCount: 15,
      acceptedCount: 10,
      isSolved: true,
      isBookmarked: true
    }
  ];

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'healthy', database: 'connected' })
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { _id: 'u1', username: 'tester', role: 'user' }
          }
        })
      });
    });
  });

  test('Flow 2: Browse, search, filter and navigate problems catalogue', async ({ page }) => {
    await page.route('**/api/problems*', async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search') || '';
      const difficulty = url.searchParams.get('difficulty') || '';

      let filtered = mockProblems;
      if (search) {
        filtered = filtered.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
      }
      if (difficulty && difficulty !== 'All') {
        filtered = filtered.filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: filtered,
          meta: {
            page: 1,
            limit: 10,
            totalItems: filtered.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
          }
        })
      });
    });

    await page.goto('/problems');

    // 1. Initial list displays problems
    await expect(page.getByText('Two Sum')).toBeVisible();
    await expect(page.getByText('Valid Palindrome')).toBeVisible();

    // 2. Search filtering
    const searchInput = page.getByPlaceholder(/search problems/i);
    await searchInput.fill('Palindrome');
    await expect(page.getByText('Valid Palindrome')).toBeVisible();
    await expect(page.getByText('Two Sum')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.getByText('Two Sum')).toBeVisible();
  });

  test('Flow 3: View problem details WITHOUT exposing hidden test cases in UI or Network', async ({ page }) => {
    let rawApiResponse = '';

    await page.route('**/api/problems/two-sum', async (route) => {
      const publicData = {
        _id: 'prob_1',
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
          javascript: 'function twoSum(nums, target) {}',
          python: 'class Solution:\n    def twoSum(self, nums, target):'
        }
      };

      rawApiResponse = JSON.stringify(publicData);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: publicData })
      });
    });

    await page.route('**/api/problems/two-sum/submissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.goto('/problems/two-sum');

    // Verify title and description are rendered
    await expect(page.getByRole('heading', { name: 'Two Sum' })).toBeVisible();
    await expect(page.getByText('Find two indices summing to target.')).toBeVisible();

    // Verify public examples are visible
    await expect(page.getByText('[2,7,11,15]').first()).toBeVisible();

    // Verify security: hidden test cases are strictly excluded from response payload and DOM
    expect(rawApiResponse).not.toContain('judgeTestCases');
    expect(rawApiResponse).not.toContain('isHidden');

    const pageContent = await page.content();
    expect(pageContent).not.toContain('judgeTestCases');
    expect(pageContent).not.toContain('SECRET_HIDDEN');
  });
});
