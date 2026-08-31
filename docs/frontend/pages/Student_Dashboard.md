# Student Dashboard

- Route: `/student` (StudentRoutes root)
- Source: `frontend/web/src/features/student/dashboard.tsx`

Purpose:
- Show student-specific KPIs: application status, verification state, fee links, admit-card and other quick actions.

Key behaviors:
- Fetches application and verification data via `applicationService` and `applicationVerificationService`.
- Shows actionable links to complete pending steps (upload docs, pay fees).

Notes:
- Protected route; expects `Authorization` token in axios defaults.
