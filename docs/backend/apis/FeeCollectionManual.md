# Fee Collection Manual API

- Base route: `api/FeeCollectionManual`

Endpoints:
- `POST /api/FeeCollectionManual` — Create fee collection manual entry. Accepts `CreateFeeCollectionManualDto`.
- `GET /api/FeeCollectionManual` — Get all entries.
- `GET /api/FeeCollectionManual/{id}` — Get by ID (GUID).
- `GET /api/FeeCollectionManual/app-no/{appNo}` — Get by application number.
- `PUT /api/FeeCollectionManual/{id}` — Update entry. Accepts `UpdateFeeCollectionManualDto`.

Notes:
- Endpoints are protected with `[Authorize]`.
