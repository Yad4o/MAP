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

    await page.goto('/tasks');
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('clicking New Task navigates to create form', async ({ page }) => {
    await page.route(/\/api\/v1\/tasks$/, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/tasks');
    await page.click('#create-task-btn');
    await page.waitForURL(/\/tasks\/new/);
    // TaskCreatePage's heading is "What do you need done?" — there is no
    // separate title field, the title is derived from the description.
    await expect(page.locator('h1')).toContainText('What do you need done?');
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

  test('submitting valid task shows it in the list', async ({ page }) => {
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

    await page.goto('/tasks/new');
    await page.locator('textarea').fill('New Automation Task');
    await page.getByRole('button', { name: 'Create task' }).click();

    await page.waitForURL('/tasks');
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole('heading', { name: 'New Automation Task' })).toBeVisible({ timeout: 10000 });
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

    await page.goto('/tasks');
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

    await page.goto('/tasks');

    // Badges use inline styles (cfg.badgeBg/cfg.badgeText), not Tailwind
    // color utility classes, and "Pending"/"Completed" also appear as
    // section headers — so scope to the specific task card by title.
    const pendingBadge = page.locator('.wise-card').filter({ hasText: 'Pending Task' }).locator('span').first();
    await expect(pendingBadge).toHaveCSS('background-color', 'rgb(255, 245, 194)'); // #fff5c2

    const completedBadge = page.locator('.wise-card').filter({ hasText: 'Completed Task' }).locator('span').first();
    await expect(completedBadge).toHaveCSS('background-color', 'rgb(226, 246, 213)'); // #e2f6d5
  });
});
