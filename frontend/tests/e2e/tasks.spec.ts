import { test, expect } from '@playwright/test';

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      const authState = {
        state: {
          user: { id: 1, email: 'test@example.com', username: 'testuser' },
          accessToken: 'fake_token',
          refreshToken: 'fake_refresh',
          isAuthenticated: true,
        },
        version: 0
      };
      localStorage.setItem('map-auth-storage', JSON.stringify(authState));
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ id: 1, email: 'test@example.com', username: 'testuser' }) });
    });
  });

  test('task list loads and shows empty state', async ({ page }) => {
    await page.route(/\/api\/v1\/tasks$/, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/dashboard');
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('clicking New Task navigates to create form', async ({ page }) => {
    await page.route(/\/api\/v1\/tasks$/, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/dashboard');
    await page.click('#create-task-btn');
    await page.waitForURL(/\/tasks\/new/);
    // TaskCreatePage's h1 is now a dynamic time-of-day greeting (e.g. "Good
    // morning, testuser"), not a fixed string, so assert on the stable
    // composer placeholder instead — the real signal that we landed on the
    // create-task screen.
    await expect(page.getByPlaceholder(/message map/i)).toBeVisible();
  });

  test('form validation prevents empty submission', async ({ page }) => {
    await page.goto('/tasks/new');

    // The Send button stays disabled below 3 characters, so it can't be
    // clicked to trigger validation. Pressing Enter in the (auto-focused)
    // textarea calls submit() unconditionally, which is how the inline
    // "Tell me a bit more..." validation message actually surfaces.
    await page.locator('textarea').press('Enter');

    await expect(page.getByText('Tell me a bit more about what you need done.')).toBeVisible();
  });

  test('submitting valid task shows the task detail page', async ({ page }) => {
    const newTask = {
      id: 101,
      title: 'New Automation Task',
      description: 'New Automation Task',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await page.route(/\/api\/v1\/tasks$/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, body: JSON.stringify(newTask) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify([newTask]) });
      }
    });
    // Task creation now routes straight to the detail page, which fetches
    // the full task (with `steps`) rather than the list-shaped payload above.
    await page.route(/\/api\/v1\/tasks\/101$/, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ ...newTask, steps: [] }) });
    });

    await page.goto('/tasks/new');
    await page.locator('textarea').fill('New Automation Task');
    await page.getByRole('button', { name: 'Create task' }).click();

    await page.waitForURL(/\/tasks\/101$/);
    await expect(page).toHaveURL(/\/tasks\/101$/);
    await expect(page.locator('h1')).toHaveText('New Automation Task', { timeout: 10000 });
  });

  test('clicking a task card opens detail page', async ({ page }) => {
    const task = {
      id: 101,
      title: 'Task to View',
      description: 'View this task',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await page.route(/\/api\/v1\/tasks\/101/, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(task) });
    });
    await page.route(/\/api\/v1\/tasks$/, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([task]) });
    });

    await page.goto('/dashboard');
    // More robust selector for the link
    const viewButton = page.getByRole('link', { name: /view/i }).first();
    await expect(viewButton).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/tasks\/101/),
      viewButton.click()
    ]);

    // Check for unique content on the detail page
    await expect(page.locator('h1')).toHaveText('Task to View', { timeout: 15000 });
    await expect(page.getByText('View this task')).toBeVisible();
  });

  test('task status badge shows correct color', async ({ page }) => {
    const tasks = [
      { id: 1, title: 'Pending Task', status: 'PENDING', created_at: new Date().toISOString() },
      { id: 2, title: 'Completed Task', status: 'COMPLETED', created_at: new Date().toISOString() },
    ];

    await page.route(/\/api\/v1\/tasks$/, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(tasks) });
    });

    await page.goto('/dashboard');

    // Badges use inline styles (cfg.badgeBg/cfg.badgeText), not Tailwind
    // color utility classes, and "Pending"/"Completed" also appear as
    // section headers — so scope to the specific task card by title.
    // Card class is `wise-card-dark-surface` (renamed from `wise-card`
    // during the dark-theme redesign), and badge colors now use the
    // dark-theme palette instead of the old light pastels.
    const pendingBadge = page.locator('.wise-card-dark-surface').filter({ hasText: 'Pending Task' }).locator('span').first();
    await expect(pendingBadge).toHaveCSS('background-color', 'rgb(54, 42, 8)'); // #362a08

    // The Completed section is collapsed by default, so we must open it first
    await page.getByRole('button', { name: /Completed/i }).click();

    const completedBadge = page.locator('.wise-card-dark-surface').filter({ hasText: 'Completed Task' }).locator('span').first();
    await expect(completedBadge).toHaveCSS('background-color', 'rgb(18, 56, 32)'); // #123820
  });
});
