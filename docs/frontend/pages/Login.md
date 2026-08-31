# Login Page

- Route: `/login`
- Source: `frontend/web/src/features/auth/login.tsx`

Purpose:
- Authenticate users (students and admins) and provide password reset flow.

Key behaviors:
- Submits credentials via `loginService.login()`; on success stores `token` and `username` in `localStorage` and sets axios `Authorization` header.
- Redirects based on role (`student` → `/student`, admin → `/admin/dashboard`).
- Forgot-password flow: verifies username using `registrationService.getRegistrationByUsername()` then calls `loginService.resetPassword()`.

Form fields & validation:
- `username` (required), `password` (required). Password visibility toggle available.
- Forgot password requires username, then enforces password complexity on reset (min 8 chars, uppercase, number).

Notes:
- On login failure, shows inline errors; stores token immediately to avoid race conditions.
