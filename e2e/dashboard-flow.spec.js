import { test, expect } from '@playwright/test';

test.describe('E2E Flow 5 & 6: User Dashboard, Progress Tracking & Bookmarks', () => {
  const mockProgress = {
    overview: {
      totalSolved: 12,
      totalProblems: 50,
      solvedPercentage: 24,
      difficultyStats: {
        easy: { solved: 8, total: 20 },
        medium: { solved: 3, total: 20 },
        hard: { solved: 1, total: 10 }
      },
      difficultyBreakdown: {
        easy: { solved: 8, total: 20 },
        medium: { solved: 3, total: 20 },
        hard: { solved: 1, total: 10 }
      },
      submissions: {
        total: 25,
        accepted: 15,
        acceptanceRate: 60
      },
      bookmarkedCount: 2
    },
    topicProgress: [
      { topic: 'Arrays & Hashing', solved: 5, total: 10, percentage: 50 }
    ],
    recentSubmissions: [
      {
        _id: 'sub_1',
        problem: { _id: 'p1', title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' },
        status: 'Accepted',
        language: 'javascript',
        executionTimeMs: 38,
        createdAt: new Date().toISOString()
      }
    ],
    activityByDate: [
      { date: '2026-04-10', count: 3 }
    ]
  };

  const mockHistory = {
    submissions: [
      {
        _id: 'sub_1',
        problemId: { _id: 'p1', title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' },
        status: 'Accepted',
        language: 'javascript',
        executionTimeMs: 38,
        memoryUsageKb: 40000,
        createdAt: new Date().toISOString()
      },
      {
        _id: 'sub_2',
        problemId: { _id: 'p2', title: 'Valid Anagram', slug: 'valid-anagram', difficulty: 'Easy' },
        status: 'Wrong Answer',
        language: 'python',
        executionTimeMs: 55,
        memoryUsageKb: 42000,
        createdAt: new Date().toISOString()
      }
    ],
    meta: {
      page: 1,
      limit: 15,
      totalItems: 2,
      totalPages: 1
    }
  };

  const mockBookmarks = {
    bookmarks: [
      {
        _id: 'bm_1',
        problem: {
          _id: 'p1',
          title: 'Two Sum',
          slug: 'two-sum',
          difficulty: 'Easy',
          topics: ['Arrays & Hashing'],
          acceptedCount: 100,
          submissionCount: 150
        },
        createdAt: new Date().toISOString()
      }
    ],
    meta: {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1
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

    // Authenticate user
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

    await page.route('**/api/users/me/progress', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockProgress })
      });
    });

    await page.route('**/api/submissions/me*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockHistory.submissions,
          meta: mockHistory.meta
        })
      });
    });

    await page.route('**/api/users/me/bookmarks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockBookmarks.bookmarks,
          meta: mockBookmarks.meta
        })
      });
    });
  });

  test('Flow 5 & 6: View progress metrics, navigate submission history, and manage bookmarks', async ({ page }) => {
    await page.goto('/dashboard');

    // 1. Progress Overview metrics
    await expect(page.getByRole('heading', { name: /developer dashboard/i })).toBeVisible();
    await expect(page.getByText('Unique Solved')).toBeVisible();
    await expect(page.getByText('60%')).toBeVisible(); // Acceptance rate
    await expect(page.getByText('Arrays & Hashing')).toBeVisible();

    // 2. Switch to Submission History Tab
    const historyTab = page.getByRole('tab', { name: /submission history/i });
    await historyTab.click();
    await expect(page.getByText('Two Sum').first()).toBeVisible();
    await expect(page.getByText('Valid Anagram')).toBeVisible();

    // 3. Switch to Bookmarks Tab
    const bookmarksTab = page.getByRole('tab', { name: /bookmarked problems/i });
    await bookmarksTab.click();
    await expect(page.getByText('Two Sum').first()).toBeVisible();
  });
});
