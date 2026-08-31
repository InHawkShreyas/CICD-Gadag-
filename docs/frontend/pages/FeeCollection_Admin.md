# Fee Collection (Admin)

- Route: `/admin/fee-collection`
- Source: `frontend/web/src/features/admin/fee-collection.tsx`

Purpose:
- View and manage fee collection records, filter by status, and export lists.

Key behaviors:
- Calls `feeCollectionService.getAll()` and supports filtering and status updates.
