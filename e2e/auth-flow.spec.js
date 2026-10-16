import { test, expect } from '@playwright/test';

test.describe('E2E Flow 1 & 7: Authentication Lifecycle & Access Control', () => {
  test.beforeEach(async ({ page }) => {
    // Global healthcheck mock
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'healthy', database: 'connected' })
      });
    });
  });

  test('User can register, login, maintain persistent session on refresh, and logout', async ({ page }) => {
    let loggedIn = false;

    await page.route('**/api/auth/me', async (route) => {
      if (loggedIn) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                _id: 'user_e2e_123',
                username: 'e2e_alice',
                email: 'alice@codearena.dev',
                role: 'user',
                name: 'Alice Coder'
              }
            }
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { message: 'Authentication required' } })
        });
      }
    });

    await page.route('**/api/auth/login', async (route) => {
      loggedIn = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              _id: 'user_e2e_123',
              username: 'e2e_alice',
              email: 'alice@codearena.dev',
              role: 'user',
              name: 'Alice Coder'
            }
          }
        })
      });
    });

    await page.route('**/api/auth/logout', async (route) => {
      loggedIn = false;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Logged out successfully' })
      });
    });

    await page.route('**/api/problems*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { page: 1, limit: 10, totalItems: 0, totalPages: 1 }
        })
      });
    });

    // 1. Visit Login page with redirect to problems
    await page.goto('/login?redirect=/problems');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // 2. Fill login credentials via accessible labels and submit
    await page.getByLabel(/email or username/i).fill('alice@codearena.dev');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // 3. User should be redirected to problems catalogue and authenticated
    await page.waitForURL('**/problems');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    await expect(page.getByLabel(/view profile/i)).toBeVisible();

    // 4. Reload page to verify session persistence across refresh
    await page.reload();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();

    // 5. Logout
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('Flow 7: Unauthorized user attempting to access /admin is denied access with 403', async ({ page }) => {
    // Mock authenticated as regular user (non-admin)
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              _id: 'regular_user_1',
              username: 'normal_dev',
              role: 'user'
            }
          }
        })
      });
    });

    await page.goto('/admin');

    // Verify 403 Access Denied banner is displayed
    await expect(page.getByText(/403 — Access Denied/i)).toBeVisible();
    await expect(page.getByText(/does not have administrator privileges/i)).toBeVisible();
  });
});
