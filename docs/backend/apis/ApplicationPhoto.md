# Application Photo API

- Base route: `api/ApplicationPhoto`

Endpoints:
- `POST /api/ApplicationPhoto` — Upload photos/signatures. Multipart form-data: `applicationId`, `appNo`, `photo`, `signature`, `parentSignature`.
- `GET /api/ApplicationPhoto/{applicationId}` — Get photo record DTO by application ID.
- `GET /api/ApplicationPhoto/{applicationId}/photo` — Download photo file.
- `GET /api/ApplicationPhoto/{applicationId}/signature` — Download signature file.
- `GET /api/ApplicationPhoto/{applicationId}/parent-signature` — Download parent signature file.

Notes:
- Files served via `IFileService`; endpoints return `File(...)` responses for binary content.
