# Customer Support API

- Base route: `api/CustomerSupport` (controller uses `api/[controller]`)

Endpoints:
- `POST /api/CustomerSupport` — Create a support ticket. Accepts `CreateSupportTicketDto`.
- `GET /api/CustomerSupport/by-username/{username}` — Get tickets by username.
- `GET /api/CustomerSupport` — Get all tickets.
- `PUT /api/CustomerSupport/{id:guid}/resolve` — Resolve a ticket. Accepts `ResolveSupportTicketDto`.
