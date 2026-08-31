# Application Query API

- Base route: `api/ApplicationQuery`

Endpoints:
- `GET /api/ApplicationQuery/my` — Get current user's application (requires auth).
- `GET /api/ApplicationQuery/full?appNo=...` — Get full application by application number.
- `POST /api/ApplicationQuery/filter` — Filter applications. Accepts `ApplicationFilterDto`.

Notes:
- Uses `ICurrentUserService` to identify the calling user for `/my`.
