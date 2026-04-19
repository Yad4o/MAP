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
    await expect(page.locator('h1')).toContainText('Create Task');
  });

  test('form validation prevents empty submission', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Description is required')).toBeVisible();
  });

  test('submitting valid task shows it in the list', async ({ page }) => {
    const newTask = {
      id: 101,
      title: 'New Automation Task',
      description: 'This is a test task',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Simplified mock: return the task for GET requests in this specific test
    await page.route(/\/api\/v1\/tasks$/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, body: JSON.stringify(newTask) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify([newTask]) });
      }
    });

    await page.goto('/tasks/new');
    await page.fill('#title', 'New Automation Task');
    await page.fill('#description', 'This is a test task');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/tasks/);
    // Wait for the task to appear with a generous timeout and specific locator
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

    // Single consolidated mock for the entire test
    await page.route('**/api/v1/tasks*', async (route) => {
      const url = route.request().url();
      if (url.includes('/101')) {
        await route.fulfill({ status: 200, body: JSON.stringify(task) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify([task]) });
      }
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

    await page.route('**/api/v1/tasks', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(tasks) });
    });

    await page.goto('/tasks');
    
    // Check pending badge (amber)
    const pendingBadge = page.locator('span:has-text("PENDING")');
    await expect(pendingBadge).toHaveClass(/text-amber-400/);
    
    // Check completed badge (emerald)
    const completedBadge = page.locator('span:has-text("COMPLETED")');
    await expect(completedBadge).toHaveClass(/text-emerald-400/);
  });
});
