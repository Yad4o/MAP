# Phase 1 — Member A: Auth API Routes

> **Layer:** FastAPI route handlers + JWT + bcrypt
> **Files you will work in:**
> - `backend/app/api/v1/auth.py`
> - `backend/app/core/security.py`
> - `backend/app/services/auth_service.py`
> - `backend/app/main.py` (uncomment auth router)

---

## What You Are Building

You are building the complete authentication system for the API. This means:

- A user can register with email, username, and password
- A user can log in and receive two tokens: a short-lived access token (JWT) and a long-lived refresh token
- Protected routes reject requests without a valid token
- Tokens can be refreshed when they expire
- Users can log out, which revokes their session

The security module handles all cryptographic operations. The service layer handles business logic. The routes just receive requests, call the service, and return responses.

---

## Windsurf Prompt

```
I am building a FastAPI authentication system for a multi-agent AI platform called MAP.

My project is already scaffolded. I need you to implement the following files completely:

1. backend/app/core/security.py
Implement these functions:
- hash_password(plain_password: str) -> str
  Use passlib with bcrypt backend, cost factor 12
- verify_password(plain_password: str, hashed_password: str) -> bool
  Use passlib to verify bcrypt hash
- create_access_token(user_id: uuid.UUID, role: str) -> tuple[str, str, datetime]
  Create RS256 JWT with payload: sub=user_id, role=role, jti=uuid4, exp=15 minutes
  Read JWT_PRIVATE_KEY and JWT_ALGORITHM from app.config.settings
  Return (token_string, jti, expires_at)
- decode_access_token(token: str) -> dict
  Decode and verify RS256 JWT using JWT_PUBLIC_KEY from settings
  Raise HTTPException 401 if expired or invalid
- generate_refresh_token() -> tuple[str, str]
  Generate 64-byte random token using secrets.token_urlsafe
  Hash it with bcrypt
  Return (raw_token, hashed_token)

2. backend/app/services/auth_service.py
Implement AuthService class with these methods:
- register(data: RegisterRequest) -> UserResponse
  Check email not taken (raise HTTPException 400 if duplicate)
  Hash password using security.hash_password
  Create user via UserRepository
  Return UserResponse
- login(email: str, password: str) -> TokenPair
  Fetch user by email (raise HTTPException 401 if not found)
  Verify password (raise HTTPException 401 if wrong)
  Generate access token and refresh token
  Create session record via SessionRepository with refresh token hash
  Update last_login_at
  Return TokenPair with expires_in = JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
- refresh(refresh_token: str) -> TokenPair
  This will be implemented in Phase 1B — leave as NotImplementedError for now
- logout(user_id: uuid.UUID, access_jti: str) -> None
  Revoke session in DB via SessionRepository
  Add access_jti to Redis revoked set with TTL = JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
- get_current_user(user_id: uuid.UUID) -> UserResponse
  Fetch user by id via UserRepository
  Raise HTTPException 404 if not found
  Return UserResponse

3. backend/app/api/v1/auth.py
Implement all route handlers by calling AuthService methods:
- POST /register → call auth_service.register
- POST /login → call auth_service.login
- POST /logout → call auth_service.logout
- GET /me → call auth_service.get_current_user
- PATCH /me → update username via UserRepository directly

4. backend/app/dependencies.py (create this file)
Create a FastAPI dependency called get_current_user:
- Read Authorization header, extract Bearer token
- Call security.decode_access_token
- Check jti against Redis revoked set (raise 401 if revoked)
- Fetch user from DB by user_id in token payload
- Return the User ORM object
Create a require_role(role: str) dependency factory that checks user.role

5. backend/app/main.py
Uncomment the auth router registration.

Use these existing imports:
- from app.config import settings
- from app.db.base import get_db
- from app.db.repositories.user_repo import UserRepository, SessionRepository
- from app.schemas.auth import RegisterRequest, LoginRequest, TokenPair, UserResponse

For Redis, use: import redis.asyncio as redis then redis.from_url(settings.REDIS_URL)

Make sure all functions are async. Use AsyncSession for all database operations.
Do not implement the UserRepository or SessionRepository — those are done by another team member.
Call their methods as if they are already implemented.
```

---

## How It Should Be Done

### security.py

The security module must never be called from routes directly. Routes call services, services call security. This separation means if you ever switch from bcrypt to argon2, you only change one file.

For JWT, you are using **RS256** (asymmetric). This means:
- The private key signs tokens (only the backend server has this)
- The public key verifies tokens (could be shared with other services)

For now the `.env` has `JWT_PRIVATE_KEY=placeholder`. The actual RSA key will be generated in Phase 1B when Member B sets up the database. For now, implement the function correctly and it will work once real keys are provided.

### auth_service.py

The service layer is the most important layer. It is the only place business rules live. Examples of business rules:
- You cannot register with an email that already exists
- You cannot login with a wrong password
- A session must be created when a user logs in

Never put these rules in the route handler. Never put them in the repository.

### dependencies.py

This file creates the `get_current_user` dependency that all protected routes will use. It works like this:

```
Request comes in with header: Authorization: Bearer eyJhbGci...
  ↓
get_current_user dependency runs
  ↓
Extracts token from header
  ↓
Decodes JWT, gets user_id and jti
  ↓
Checks Redis: is this jti in the revoked set? → 401 if yes
  ↓
Fetches user from DB by user_id → 401 if not found
  ↓
Returns User object to the route handler
```

Any route that needs authentication just adds `current_user: User = Depends(get_current_user)` to its parameters.

---

## Acceptance Criteria

- [ ] `POST /api/v1/auth/register` with valid data returns `201` and a user object
- [ ] `POST /api/v1/auth/register` with duplicate email returns `400`
- [ ] `POST /api/v1/auth/login` with correct credentials returns `200` and a token pair
- [ ] `POST /api/v1/auth/login` with wrong password returns `401`
- [ ] `GET /api/v1/auth/me` with valid JWT returns user profile
- [ ] `GET /api/v1/auth/me` without token returns `401`
- [ ] `GET /api/v1/auth/me` with expired token returns `401`
- [ ] All routes visible in `/docs` Swagger UI
- [ ] No hardcoded values — all config comes from `settings`
