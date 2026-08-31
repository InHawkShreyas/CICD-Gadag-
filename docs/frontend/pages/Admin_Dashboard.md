# Admin Dashboard

- Route: `/admin/dashboard`
- Source: `frontend/web/src/features/general/admin_dashboard.tsx`

Purpose:
- Admin overview with KPIs and charts: applications per day, verification breakdown, monthly fee collections.

Key behaviors:
- Aggregates data from `applicationService`, `applicationVerificationService`, and `feeCollectionService` to render charts (Recharts).
