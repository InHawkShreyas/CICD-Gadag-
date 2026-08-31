# Login API

- Base route: `api/login`

Endpoints:
- `POST /api/login/set-password` — Set password after registration. Accepts `CreateLoginDto`.
- `POST /api/login` — Authenticate user. Accepts `LoginRequestDto`.
- `POST /api/login/reset-password` — Initiate password reset. Accepts `ForgotPasswordDto`.
- `GET /api/login/{username}` — Get user profile by username.
- `POST /api/login/update-role` — Update user role. Accepts `UpdateRoleRequestDto`.

Notes:
- Authentication and token handling implemented in `ILoginService`.
