# University API

- Base route: `api/university`

Endpoints:
- `POST /api/university` — Create a university. Accepts `CreateUniversityDto`.
- `GET /api/university` — Get all universities.
- `GET /api/university/{id}` — Get by ID.
- `PUT /api/university` — Update university. Accepts `UpdateUniversityDto`.
- `DELETE /api/university/{id}` — Soft delete a university.

Notes:
- Endpoints require authorization.
