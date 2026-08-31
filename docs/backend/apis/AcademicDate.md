# Academic Date API

- Base route: `api/AcademicDate` (controller uses `api/[controller]`)

Endpoints:
- `POST /api/AcademicDate` — Create academic date. Accepts `CreateAcademicDateDto`.
- `GET /api/AcademicDate` — Get all academic dates.
- `GET /api/AcademicDate/{id}` — Get by ID.
- `PUT /api/AcademicDate` — Update academic date. Accepts `UpdateAcademicDateDto`.
- `DELETE /api/AcademicDate/{id}` — Soft delete by ID.

Notes:
- Endpoints require authorization.
