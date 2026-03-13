# Phase 1 — Member C: Auth Frontend

> **Layer:** React pages + Zustand store + API integration
> **Files you will work in:**
> - `frontend/src/pages/LoginPage.tsx`
> - `frontend/src/pages/RegisterPage.tsx`
> - `frontend/src/store/authStore.ts`
> - `frontend/src/api/auth.ts`
> - `frontend/src/api/client.ts`
> - `frontend/src/App.tsx` (create this)
> - `frontend/src/main.tsx` (create this)

---

## What You Are Building

You are building the complete authentication UI. This means:

- A login page with email and password fields
- A register page with email, username, and password fields
- Client-side form validation with helpful error messages
- JWT tokens stored in memory (Zustand store) — never in localStorage
- Automatic redirect to `/tasks` after successful login
- Protected routes that redirect to `/login` if not authenticated
- The axios client automatically attaches the JWT to every request

You are building against the real API endpoints that Member A is building simultaneously. Since their endpoints return `NotImplementedError` right now, you will use **MSW (Mock Service Worker)** to intercept API calls and return fake data so you can develop without waiting.

---

## Windsurf Prompt

```
I am building the React authentication frontend for a multi-agent AI platform called MAP.

The project uses: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, React Hook Form, Zod, Zustand, and Axios.

Please install any missing dependencies first using npm install.

1. Create frontend/src/main.tsx
Standard React 18 entry point with QueryClientProvider and BrowserRouter wrapping the App component.
Import and start MSW in development mode.

2. Create frontend/src/App.tsx
Set up React Router with these routes:
- / → redirect to /tasks
- /login → LoginPage (public route)
- /register → RegisterPage (public route)
- /tasks → TaskListPage (protected route — redirect to /login if not authenticated)
- /tasks/new → TaskCreatePage (protected route)
- /tasks/:id → TaskDetailPage (protected route)
- /history → HistoryPage (protected route)
- /logs → LogsPage (protected route)
- /admin → AdminPage (protected route, role=ADMIN)
- /settings → SettingsPage (protected route)

Create a ProtectedRoute component that reads isAuthenticated from useAuthStore.
If not authenticated, redirect to /login using Navigate component from react-router-dom.

3. Complete frontend/src/store/authStore.ts
Implement the login action:
- Call authApi.login({ email, password })
- Call setTokens(access_token, refresh_token)
- Call authApi.getMe() to fetch user profile
- Call setUser(user)
- Handle errors by throwing them so the component can catch them

Implement the logout action:
- Try to call authApi.logout()
- Always call clearAuth() regardless of API success

4. Complete frontend/src/api/client.ts
Implement the request interceptor:
- Read accessToken from useAuthStore.getState().accessToken
- If it exists, set config.headers.Authorization = `Bearer ${token}`

Implement the response interceptor for 401 errors:
- If error.response.status === 401 and it's not the /auth/login or /auth/refresh route
- Try to call authApi.refreshToken using the refresh token from the store
- If refresh succeeds: update tokens in store, retry the original request
- If refresh fails: call clearAuth() and redirect to /login

5. Create frontend/src/pages/LoginPage.tsx
Professional login form using React Hook Form and Zod validation.
Schema: email (must be valid email), password (min 8 chars).
Show inline error messages below each field.
Show a loading spinner on the submit button while logging in.
Show a general error message if login fails (wrong credentials).
On success: navigate to /tasks.
Include a link to /register at the bottom.
Style with Tailwind CSS — centered card layout, clean and professional.

6. Create frontend/src/pages/RegisterPage.tsx
Registration form with fields: email, username (min 3 chars), password (min 8 chars), confirm password (must match).
Same style as login page.
On success: automatically log the user in and navigate to /tasks.
Include a link to /login at the bottom.

7. Create frontend/src/mocks/ directory with these files:

frontend/src/mocks/browser.ts:
Set up MSW browser worker with handlers from handlers.ts

frontend/src/mocks/handlers.ts:
Create MSW handlers for:
- POST /api/v1/auth/login → return { access_token: "mock-jwt", refresh_token: "mock-refresh", token_type: "bearer", expires_in: 900 }
- POST /api/v1/auth/register → return a mock UserResponse object
- GET /api/v1/auth/me → return { id: "uuid-here", email: "test@test.com", username: "testuser", role: "USER", tier: "free", is_active: true, email_verified: false }

Install MSW: npm install msw --save-dev
Run: npx msw init public/ --save

All components should be functional components with TypeScript.
Use Tailwind CSS for all styling — no custom CSS files.
The design should be clean, minimal, and professional.
Use the existing types from frontend/src/types/index.ts — do not redefine them.
```

---

## How It Should Be Done

### Why MSW for Mocking

MSW (Mock Service Worker) intercepts network requests at the browser level. This means:

- Your React code calls the real API URL (`http://localhost:8000/api/v1/auth/login`)
- MSW intercepts it before it reaches the network
- MSW returns the fake response you defined
- Your component receives the response exactly as if the real API responded

When Member A finishes the real API, you just remove the MSW handler for that route and your code works against the real backend with zero changes.

### Token Storage Strategy

Tokens go in **Zustand store (memory only)** — never in `localStorage`. This protects against XSS attacks where malicious JavaScript reads your tokens.

The tradeoff is that tokens are lost on page refresh. Handle this in `App.tsx` by attempting a token refresh on mount — if the refresh token cookie exists, silently refresh and restore the session.

### Form Validation with Zod

Define your validation schema separately from the component:

```typescript
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
```

Then pass it to `useForm` via `zodResolver`. This gives you typed form values and automatic validation without writing any validation logic yourself.

### Protected Routes

The `ProtectedRoute` component is simple:

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

Wrap every non-public route with this in `App.tsx`.

---

## Acceptance Criteria

- [ ] Login page renders at `/login` with email and password fields
- [ ] Register page renders at `/register` with all four fields
- [ ] Form validation shows errors inline (not alerts)
- [ ] Clicking login with MSW running successfully logs in and redirects to `/tasks`
- [ ] Going to `/tasks` while not logged in redirects to `/login`
- [ ] The browser network tab shows requests being intercepted by MSW
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] No tokens stored in localStorage (check Application tab in DevTools)
