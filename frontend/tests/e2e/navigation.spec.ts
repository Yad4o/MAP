import { test, expect } from '@playwright/test';

const ADMIN_USER = { id: 1, email: 'admin@example.com', username: 'admin', role: 'ADMIN', tier: 'pro', email_verified: true };

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up auth state in localStorage BEFORE the page loads
    await page.addInitScript((user) => {
      const authState = {
        state: {
          user,
          accessToken: 'fake_token',
          refreshToken: 'fake_refresh',
          isAuthenticated: true,
        },
        version: 0
      };
      localStorage.setItem('map-auth-storage', JSON.stringify(authState));
    }, ADMIN_USER);

    // Regex catch-all: intercepts ALL /api/v1/ requests so nothing can trigger a logout.
    // Registered before page.goto() so it's active for the initial page load.
    await page.route(/\/api\/v1\//, async (route) => {
      const url = route.request().url();
      // Return the full user object for /auth/me so the store hydrates with ADMIN role
      if (url.includes('/auth/me')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ADMIN_USER) });
      } else if (url.includes('/tasks')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        // Everything else (api-keys, memory, provider-keys, admin endpoints, etc.) -> empty list
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });
  });

  test('all sidebar links navigate to correct pages', async ({ page }) => {
    await page.goto('/tasks');

    // Wait for the sidebar to fully settle (Admin section only renders
    // once the auth store has hydrated from localStorage)
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();

    const navItems = [
      { label: 'History', url: /\/history/ },
      { label: 'Logs',    url: /\/logs/ },
      { label: 'Settings', url: /\/settings/ },
      { label: 'Admin',  url: /\/admin/ },
      { label: 'Tasks',  url: /\/tasks/ },
    ];

    for (const item of navItems) {
      // Use locator with sidebar scope to avoid ambiguity
      const sidebar = page.locator('aside');
      const link = sidebar.getByRole('link', { name: item.label, exact: true });
      // Use force to bypass stability checks if caught in a React re-render
      await link.click({ force: true });
      await expect(page).toHaveURL(item.url);
      // Brief pause for page transitions to settle
      await page.waitForTimeout(300);
    }
  });

  test('browser back button works correctly', async ({ page }) => {
    await page.goto('/tasks');
    await page.click('nav a:has-text("History")');
    await expect(page).toHaveURL(/\/history/);

    await page.goBack();
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto('/some-non-existent-route');

    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page Not Found')).toBeVisible();

    // Test return home button
    await page.click('text=Return Home');
    await expect(page).toHaveURL(/\/tasks/);
  });
});
