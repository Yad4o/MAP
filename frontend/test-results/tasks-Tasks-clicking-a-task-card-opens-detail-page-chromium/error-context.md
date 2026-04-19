# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tasks.spec.ts >> Tasks >> clicking a task card opens detail page
- Location: tests\tasks.spec.ts:81:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('h1')
Expected: "Task to View"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('h1')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e6]:
      - img [ref=e8]
      - generic [ref=e13]: MAP Platform
    - navigation [ref=e14]:
      - paragraph [ref=e15]: Navigation
      - link "Tasks" [ref=e16] [cursor=pointer]:
        - /url: /tasks
        - img [ref=e17]
        - generic [ref=e20]: Tasks
      - link "History" [ref=e21] [cursor=pointer]:
        - /url: /history
        - img [ref=e22]
        - generic [ref=e25]: History
      - link "Logs" [ref=e26] [cursor=pointer]:
        - /url: /logs
        - img [ref=e27]
        - generic [ref=e29]: Logs
      - link "Settings" [ref=e30] [cursor=pointer]:
        - /url: /settings
        - img [ref=e31]
        - generic [ref=e34]: Settings
    - generic [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: T
        - generic [ref=e38]:
          - paragraph [ref=e39]: testuser
          - paragraph [ref=e40]: test@example.com
      - button "Sign Out" [ref=e41] [cursor=pointer]:
        - img [ref=e42]
        - generic [ref=e45]: Sign Out
  - main [ref=e46]:
    - generic [ref=e49]:
      - img [ref=e50]
      - paragraph [ref=e52]: Fetching task details...
```

# Test source

```ts
  12  |           isAuthenticated: true,
  13  |         },
  14  |         version: 0
  15  |       };
  16  |       localStorage.setItem('map-auth-storage', JSON.stringify(authState));
  17  |     });
  18  | 
  19  |     await page.route('**/api/v1/auth/me', async (route) => {
  20  |       await route.fulfill({ status: 200, body: JSON.stringify({ id: 1, email: 'test@example.com', username: 'testuser' }) });
  21  |     });
  22  |   });
  23  | 
  24  |   test('task list loads and shows empty state', async ({ page }) => {
  25  |     await page.route(/\/api\/v1\/tasks$/, async (route) => {
  26  |       await route.fulfill({ status: 200, body: JSON.stringify([]) });
  27  |     });
  28  | 
  29  |     await page.goto('/tasks');
  30  |     await expect(page.getByText('No tasks yet')).toBeVisible();
  31  |   });
  32  | 
  33  |   test('clicking New Task navigates to create form', async ({ page }) => {
  34  |     await page.route(/\/api\/v1\/tasks$/, async (route) => {
  35  |       await route.fulfill({ status: 200, body: JSON.stringify([]) });
  36  |     });
  37  | 
  38  |     await page.goto('/tasks');
  39  |     await page.click('#create-task-btn');
  40  |     await page.waitForURL(/\/tasks\/new/);
  41  |     await expect(page.locator('h1')).toContainText('Create Task');
  42  |   });
  43  | 
  44  |   test('form validation prevents empty submission', async ({ page }) => {
  45  |     await page.goto('/tasks/new');
  46  |     await page.click('button[type="submit"]');
  47  | 
  48  |     await expect(page.getByText('Title is required')).toBeVisible();
  49  |     await expect(page.getByText('Description is required')).toBeVisible();
  50  |   });
  51  | 
  52  |   test('submitting valid task shows it in the list', async ({ page }) => {
  53  |     const newTask = {
  54  |       id: 101,
  55  |       title: 'New Automation Task',
  56  |       description: 'This is a test task',
  57  |       status: 'PENDING',
  58  |       created_at: new Date().toISOString(),
  59  |       updated_at: new Date().toISOString()
  60  |     };
  61  | 
  62  |     // Simplified mock: return the task for GET requests in this specific test
  63  |     await page.route(/\/api\/v1\/tasks$/, async (route) => {
  64  |       if (route.request().method() === 'POST') {
  65  |         await route.fulfill({ status: 201, body: JSON.stringify(newTask) });
  66  |       } else {
  67  |         await route.fulfill({ status: 200, body: JSON.stringify([newTask]) });
  68  |       }
  69  |     });
  70  | 
  71  |     await page.goto('/tasks/new');
  72  |     await page.fill('#title', 'New Automation Task');
  73  |     await page.fill('#description', 'This is a test task');
  74  |     await page.click('button[type="submit"]');
  75  | 
  76  |     await expect(page).toHaveURL(/\/tasks/);
  77  |     // Wait for the task to appear with a generous timeout and specific locator
  78  |     await expect(page.getByRole('heading', { name: 'New Automation Task' })).toBeVisible({ timeout: 10000 });
  79  |   });
  80  | 
  81  |   test('clicking a task card opens detail page', async ({ page }) => {
  82  |     const task = {
  83  |       id: 101,
  84  |       title: 'Task to View',
  85  |       description: 'View this task',
  86  |       status: 'PENDING',
  87  |       created_at: new Date().toISOString(),
  88  |       updated_at: new Date().toISOString()
  89  |     };
  90  | 
  91  |     // Single consolidated mock for the entire test
  92  |     await page.route('**/api/v1/tasks*', async (route) => {
  93  |       const url = route.request().url();
  94  |       if (url.includes('/101')) {
  95  |         await route.fulfill({ status: 200, body: JSON.stringify(task) });
  96  |       } else {
  97  |         await route.fulfill({ status: 200, body: JSON.stringify([task]) });
  98  |       }
  99  |     });
  100 | 
  101 |     await page.goto('/tasks');
  102 |     // More robust selector for the link
  103 |     const viewButton = page.getByRole('link', { name: /view/i }).first();
  104 |     await expect(viewButton).toBeVisible();
  105 |     
  106 |     await Promise.all([
  107 |       page.waitForURL(/\/tasks\/101/),
  108 |       viewButton.click()
  109 |     ]);
  110 |     
  111 |     // Check for unique content on the detail page
> 112 |     await expect(page.locator('h1')).toHaveText('Task to View', { timeout: 15000 });
      |                                      ^ Error: expect(locator).toHaveText(expected) failed
  113 |     await expect(page.getByText('View this task')).toBeVisible();
  114 |   });
  115 | 
  116 |   test('task status badge shows correct color', async ({ page }) => {
  117 |     const tasks = [
  118 |       { id: 1, title: 'Pending Task', status: 'PENDING', created_at: new Date().toISOString() },
  119 |       { id: 2, title: 'Completed Task', status: 'COMPLETED', created_at: new Date().toISOString() },
  120 |     ];
  121 | 
  122 |     await page.route('**/api/v1/tasks', async (route) => {
  123 |       await route.fulfill({ status: 200, body: JSON.stringify(tasks) });
  124 |     });
  125 | 
  126 |     await page.goto('/tasks');
  127 |     
  128 |     // Check pending badge (amber)
  129 |     const pendingBadge = page.locator('span:has-text("PENDING")');
  130 |     await expect(pendingBadge).toHaveClass(/text-amber-400/);
  131 |     
  132 |     // Check completed badge (emerald)
  133 |     const completedBadge = page.locator('span:has-text("COMPLETED")');
  134 |     await expect(completedBadge).toHaveClass(/text-emerald-400/);
  135 |   });
  136 | });
  137 | 
```