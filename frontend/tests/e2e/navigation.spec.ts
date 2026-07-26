import { test, expect } from '@playwright/test';

const ADMIN_USER = {
  id: 1,
  email: 'admin@example.com',
  username: 'admin',
  role: 'ADMIN',
  tier: 'pro',
  email_verified: true,
};

/**
 * Helper: sets up a fully mocked + authenticated session for an ADMIN user.
 * A single regex handler intercepts ALL /api/v1/ requests so nothing leaks
 * through to the real network (which would trigger 401 → clearAuth → logout).
 */
async function setupAdminSession(page: import('@playwright/test').Page) {
  // 1. Regex catch-all — must be registered BEFORE goto() so it's ready on
  //    the very first network request made during page load.
  await page.route(/\/api\/v1\//, async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADMIN_USER),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
  });

  // 2. Seed localStorage before any script runs (addInitScript guarantees this).
  await page.addInitScript((user) => {
    localStorage.setItem(
      'map-auth-storage',
      JSON.stringify({
        state: {
          user,
          accessToken: 'fake_token',
          refreshToken: 'fake_refresh',
          isAuthenticated: true,
        },
        version: 0,
      }),
    );
  }, ADMIN_USER);
}

test.describe('Navigation', () => {
  // Test each link independently so no background timers or query-cache
  // from a previous page can interfere with the next navigation.
  const navItems = [
    { label: 'History', url: /\/history/ },
    { label: 'Logs',    url: /\/logs/ },
    { label: 'Settings', url: /\/settings/ },
    { label: 'Admin',  url: /\/admin/ },
    { label: 'Dashboard', url: /\/dashboard/ },
    { label: 'New Task',  url: /\/tasks\/new/ },
  ];

  for (const item of navItems) {
    test(`sidebar link "${item.label}" navigates to correct page`, async ({ page }) => {
      await setupAdminSession(page);
      await page.goto('/dashboard');

      // Wait for auth to hydrate — the Admin link is only rendered when role=ADMIN
      await expect(
        page.locator('aside').getByRole('link', { name: 'Admin', exact: true }),
      ).toBeVisible();

      // Click the target link
      const link = page.locator('aside').getByRole('link', { name: item.label, exact: true });
      await link.click({ force: true });

      // Verify URL changed
      await expect(page).toHaveURL(item.url);
    });
  }

  test('browser back button works correctly', async ({ page }) => {
    await setupAdminSession(page);
    await page.goto('/dashboard');
    await page.click('nav a:has-text("History")');
    await expect(page).toHaveURL(/\/history/);

    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('unknown route shows 404 page', async ({ page }) => {
    await setupAdminSession(page);
    await page.goto('/some-non-existent-route');

    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page Not Found')).toBeVisible();

    // Test return home button
    await page.click('text=Return Home');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
