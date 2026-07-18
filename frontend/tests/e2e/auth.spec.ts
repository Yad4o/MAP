import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Basic setup for all auth tests
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthorized' }) });
    });
  });

  test('registers new user successfully', async ({ page }) => {
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({ status: 201, body: JSON.stringify({ id: 1, email: 'test@example.com', username: 'testuser' }) });
    });

    await page.goto('/register');
    await page.fill('#username', 'testuser');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.click('button[type="submit"]');

    // RegisterPage does not auto-login — it sends the user to /login to sign in.
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows validation errors on invalid email', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#email', 'invalid-email');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    // Message comes from the zod schema on RegisterPage/LoginPage.
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('shows error on wrong password', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ detail: 'Invalid credentials' }) });
    });

    await page.goto('/login');
    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');

    // LoginPage renders serverError as <p role="alert" className="hero-v2__oauth-error">
    await expect(page.getByRole('alert')).toContainText(/invalid credentials|incorrect/i);
  });

  test('redirects to /tasks after login', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'fake_token', refresh_token: 'fake_refresh' }) });
    });
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ id: 1, email: 'test@example.com', username: 'testuser' }) });
    });

    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/tasks/);
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    // Simulate being logged in
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
    await page.route('**/api/v1/auth/logout', async (route) => {
      await route.fulfill({ status: 200 });
    });
    await page.route('**/api/v1/tasks', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/tasks');
    await page.click('button:has-text("Sign Out")');

    await expect(page).toHaveURL(/\/login/);

    // Check if auth state is cleared in localStorage
    const storageValue = await page.evaluate(() => localStorage.getItem('map-auth-storage'));
    const parsed = JSON.parse(storageValue || '{}');
    expect(parsed?.state?.isAuthenticated).toBe(false);
  });

  test('cannot access /tasks without login', async ({ page }) => {
    // Initial /auth/me returns 401 in beforeEach
    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/login/);
  });
});
