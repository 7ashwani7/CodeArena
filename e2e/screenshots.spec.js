import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.resolve(process.cwd(), 'docs/screenshots');

test.describe('Generate Real Product Screenshots', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  const mockUser = {
    _id: 'user_dev_1',
    username: 'alex_chen',
    email: 'alex@codearena.dev',
    role: 'admin',
    name: 'Alex Chen'
  };

  const mockProblems = [
    {
      _id: 'p1',
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'Easy',
      topics: ['Arrays & Hashing'],
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' }
      ],
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Only one valid answer exists.'],
      starterCode: {
        javascript: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}',
        python: 'class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        prevMap = {}\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in prevMap:\n                return [prevMap[diff], i]\n            prevMap[n] = i\n        return []'
      },
      submissionCount: 1420,
      acceptedCount: 980,
      isSolved: true,
      isBookmarked: true
    },
    {
      _id: 'p2',
      title: 'Valid Palindrome',
      slug: 'valid-palindrome',
      difficulty: 'Easy',
      topics: ['Two Pointers', 'String'],
      description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.',
      examples: [{ input: 's = "A man, a plan, a canal: Panama"', output: 'true' }],
      constraints: ['1 <= s.length <= 2 * 10^5'],
      submissionCount: 890,
      acceptedCount: 610,
      isSolved: true,
      isBookmarked: false
    },
    {
      _id: 'p3',
      title: 'Longest Substring Without Repeating Characters',
      slug: 'longest-substring-without-repeating-characters',
      difficulty: 'Medium',
      topics: ['Sliding Window', 'String'],
      description: 'Given a string s, find the length of the longest substring without duplicate characters.',
      examples: [{ input: 's = "abcabcbb"', output: '3' }],
      constraints: ['0 <= s.length <= 5 * 10^4'],
      submissionCount: 1120,
      acceptedCount: 540,
      isSolved: false,
      isBookmarked: true
    },
    {
      _id: 'p4',
      title: 'Reverse Linked List',
      slug: 'reverse-linked-list',
      difficulty: 'Easy',
      topics: ['Linked List'],
      description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
      examples: [{ input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' }],
      constraints: ['0 <= Node count <= 5000'],
      submissionCount: 750,
      acceptedCount: 590,
      isSolved: true,
      isBookmarked: false
    },
    {
      _id: 'p5',
      title: 'Median of Two Sorted Arrays',
      slug: 'median-of-two-sorted-arrays',
      difficulty: 'Hard',
      topics: ['Binary Search', 'Arrays & Hashing'],
      description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
      examples: [{ input: 'nums1 = [1,3], nums2 = [2]', output: '2.00000' }],
      constraints: ['0 <= m, n <= 1000', 'The overall run time complexity should be O(log (m+n)).'],
      submissionCount: 430,
      acceptedCount: 120,
      isSolved: false,
      isBookmarked: false
    }
  ];

  const mockProgress = {
    overview: {
      totalSolved: 18,
      totalProblems: 45,
      solvedPercentage: 40,
      difficultyStats: {
        easy: { solved: 12, total: 20 },
        medium: { solved: 5, total: 18 },
        hard: { solved: 1, total: 7 }
      },
      difficultyBreakdown: {
        easy: { solved: 12, total: 20 },
        medium: { solved: 5, total: 18 },
        hard: { solved: 1, total: 7 }
      },
      submissions: {
        total: 42,
        accepted: 28,
        acceptanceRate: 67
      },
      bookmarkedCount: 4
    },
    topicProgress: [
      { topic: 'Arrays & Hashing', solved: 7, total: 12, percentage: 58 },
      { topic: 'Two Pointers', solved: 4, total: 8, percentage: 50 },
      { topic: 'Sliding Window', solved: 3, total: 6, percentage: 50 },
      { topic: 'Linked List', solved: 3, total: 7, percentage: 43 },
      { topic: 'Binary Search', solved: 1, total: 6, percentage: 17 }
    ],
    recentSubmissions: [
      {
        _id: 's1',
        problem: { _id: 'p1', title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' },
        status: 'Accepted',
        language: 'javascript',
        executionTimeMs: 42,
        createdAt: new Date().toISOString()
      },
      {
        _id: 's2',
        problem: { _id: 'p2', title: 'Valid Palindrome', slug: 'valid-palindrome', difficulty: 'Easy' },
        status: 'Accepted',
        language: 'python',
        executionTimeMs: 51,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    activityByDate: [
      { date: '2026-10-10', count: 3 },
      { date: '2026-10-11', count: 5 },
      { date: '2026-10-12', count: 2 },
      { date: '2026-10-13', count: 6 },
      { date: '2026-10-14', count: 4 },
      { date: '2026-10-15', count: 7 },
      { date: '2026-10-16', count: 5 }
    ]
  };

  test('Capture all screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Setup routes
    await page.route('**/api/health', async (r) => {
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status: 'healthy', database: 'connected' }) });
    });

    await page.route('**/api/auth/me', async (r) => {
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: mockUser } }) });
    });

    await page.route('**/api/problems*', async (r) => {
      const url = new URL(r.request().url());
      if (url.pathname.includes('/two-sum/submissions')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { _id: 'sub_prev', status: 'Accepted', language: 'javascript', executionTimeMs: 42, memoryUsageKb: 38200, createdAt: new Date().toISOString() }
            ]
          })
        });
      }
      if (url.pathname.endsWith('/two-sum')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockProblems[0] })
        });
      }
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockProblems,
          meta: { page: 1, limit: 10, totalItems: mockProblems.length, totalPages: 1 }
        })
      });
    });

    await page.route('**/api/users/me/progress', async (r) => {
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockProgress }) });
    });

    await page.route('**/api/submissions/me*', async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: 's1',
              problemId: { _id: 'p1', title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' },
              status: 'Accepted',
              language: 'javascript',
              executionTimeMs: 42,
              memoryUsageKb: 38200,
              createdAt: new Date().toISOString()
            },
            {
              _id: 's2',
              problemId: { _id: 'p2', title: 'Valid Palindrome', slug: 'valid-palindrome', difficulty: 'Easy' },
              status: 'Accepted',
              language: 'python',
              executionTimeMs: 51,
              memoryUsageKb: 41100,
              createdAt: new Date(Date.now() - 3600000).toISOString()
            }
          ],
          meta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 }
        })
      });
    });

    await page.route('**/api/users/me/bookmarks*', async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { _id: 'bm1', problem: mockProblems[0], createdAt: new Date().toISOString() },
            { _id: 'bm2', problem: mockProblems[2], createdAt: new Date().toISOString() }
          ],
          meta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 }
        })
      });
    });

    // 1. Home Page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'hero-home.png'), fullPage: false });

    // 2. Problems Catalog
    await page.goto('/problems');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'problems-catalog.png'), fullPage: false });

    // 3. Coding Workspace
    await page.goto('/problems/two-sum');
    await page.waitForLoadState('networkidle');
    // Wait for Monaco editor to settle
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'code-workspace.png'), fullPage: false });

    // 4. Developer Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'developer-dashboard.png'), fullPage: false });

    // 5. Admin Problem Management
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'admin-management.png'), fullPage: false });
  });
});
