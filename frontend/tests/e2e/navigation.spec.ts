import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication as Admin to see all links
    await page.addInitScript(() => {
      const authState = {
        state: {
          user: { id: 1, email: 'admin@example.com', username: 'admin', role: 'ADMIN' },
          accessToken: 'fake_token',
          refreshToken: 'fake_refresh',
          isAuthenticated: true,
        },
        version: 0
      };
      localStorage.setItem('map-auth-storage', JSON.stringify(authState));
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ id: 1, email: 'admin@example.com', username: 'admin', role: 'ADMIN' }) });
    });

    // Mock tasks to avoid empty state hanging if needed
    await page.route('**/api/v1/tasks', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    // Register the admin route mock up front so it's active before any
    // click reaches /admin — avoids adding a route mid-loop.
    await page.route(/\/api\/v1\/admin/, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
  });

  test('all sidebar links navigate to correct pages', async ({ page }) => {
    await page.goto('/tasks');

    // Wait for the sidebar to fully settle (Admin section only renders
    // once the auth store has hydrated) before starting to click through.
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();

    const navItems = [
      { label: 'History', url: /\/history/ },
      { label: 'Logs', url: /\/logs/ },
      { label: 'Settings', url: /\/settings/ },
      { label: 'Admin', url: /\/admin/ },
      { label: 'Tasks', url: /\/tasks/ },
    ];

    for (const item of navItems) {
      await page.getByRole('link', { name: item.label, exact: true }).click();
      await expect(page).toHaveURL(item.url);
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
