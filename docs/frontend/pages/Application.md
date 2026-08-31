# Application Page

- Route: `/student/application`
- Source: `frontend/web/src/features/student/application.tsx`

Purpose:
- The main application form used by students to submit program preferences, personal details, seat types and other application data.

Key behaviors:
- Loads lookup data (`degreeService`, `courseService`, `lookupService`) to populate selects.
- Creates or updates application via `applicationService.create` / `applicationService.update`.
- Performs client-side validation for required fields and shows inline errors.

Form fields:
- Personal details, addresses, programme selection, seat type, education history (links to education detail pages), and file upload pointers (photos/documents handled separately).

Notes:
- The application is multi-step in UI; saving will either create or update existing application based on presence of identifiers.
