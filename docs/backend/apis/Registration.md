# Registration API

- Base route: `api/registration`

Endpoints:
- `POST /api/registration` — Create a registration. Accepts `RegistrationRequestDto`.
- `GET /api/registration/{username}` — Get a registration by username.
- `GET /api/registration` — Get all registrations.
- `DELETE /api/registration/{username}` — Soft delete a registration.

Notes:
- Business logic handled by `IRegistrationService` in `UniversitySystem.Application`.
