# Application API

- Base route: `api/Application`

Endpoints:
- `POST /api/Application` — Create an application. Accepts `CreateApplicationFullDto`.
- `GET /api/Application` — Get all applications.
- `GET /api/Application/{id}` — Get application by ID.
- `PUT /api/Application/{appNo}` — Update application by application number.
- `DELETE /api/Application/{id}` — Soft delete application by ID.

Notes:
- Errors are caught and returned as `BadRequest` or `StatusCode(500)` depending on exception.
- Business workflows are in `IApplicationService`.
