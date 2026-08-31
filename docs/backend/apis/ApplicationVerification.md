# Application Verification API

- Base route: `api/ApplicationVerification`

Endpoints:
- `POST /api/ApplicationVerification` — Create verification record. Accepts `CreateApplicationVerificationDto`.
- `PUT /api/ApplicationVerification` — Update verification. Accepts `UpdateApplicationVerificationDto`.
- `GET /api/ApplicationVerification` — Get all verifications.
- `GET /api/ApplicationVerification/{id}` — Get verification by ID.
- `GET /api/ApplicationVerification/by-app-no/{appNo}` — Get verification by application number.
- `DELETE /api/ApplicationVerification/{id}` — Soft delete verification.
