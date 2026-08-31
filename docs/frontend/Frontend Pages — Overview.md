
Overview

This document lists all pages implemented in the frontend (`frontend/web/src`) and explains how each page works, key behaviors, and the services it calls.

## Routing map
- Public: `/` → LandingPage
- Auth: `/login`, `/registration`
- Admin: `/admin/*` (see AdminRoutes)
- Student: `/student/*` (see StudentRoutes)

Route files:
- `src/routes/AppRoutes.tsx` — Main routes for public, auth, admin and student entry points.
- `src/routes/AdminRoutes.tsx` — Admin sub-routes (dashboard, fee-structure, fee-collection, etc.).
- `src/routes/StudentRoutes.tsx` — Student sub-routes (dashboard, application, documents, fees, photos).

## Public & Auth pages

- Landing (`src/features/general/landing.tsx`) — public marketing page showing application steps, programmes and notifications. Polls `notificationService.getNotifications()` every 30s for new notices and shows toast. Navigation links to `/login` and registration flow.

- Login (`src/features/auth/login.tsx`) — handles sign-in and password reset. Uses `loginService.login()` to authenticate, stores `token` and `username` in `localStorage`, sets axios default `Authorization` header, then redirects based on user role. Also supports forgot-password flow that verifies username and calls `loginService.resetPassword()`.

- Registration (`src/features/auth/registration.tsx`) — multi-step (basic info → OTP → password). Creates a registration via `registrationService.createRegistration()`, sends OTP via `otpService.sendOtp()`, verifies with `otpService.verifyOtp()`, and finally calls `loginService.setPassword()` to finalize account creation. Includes client-side validation for fields (name, mobile, aadhar/passport, password rules).

## Student pages (routes prefix: `/student`)

- Student Dashboard (`src/features/student/dashboard.tsx`) — summary KPIs for student (application status, verification, fee links). Calls application and verification services to show current state.

- Application (`src/features/student/application.tsx`) — full application form (multi-section). Uses lookup services (`lookupService`, `degreeService`, `courseService`) and posts application data to `applicationService`. Client-side validation and save/update flows present.

- Documents (`src/features/student/documents.tsx`) — list & upload document pages. Uses `applicationDocumentsService` (upload via multipart/form-data) and lists uploaded documents. Downloads use `File` responses from file service endpoints.

- Photo Upload (`src/features/student/photo.tsx`) — upload passport photo, signature and parent signature. Uses `applicationPhotoService.upload()` with multipart form-data. Provides preview and file download endpoints via `fileService`.

- Fees (application-fee, admission-fee, fee-response, fee-receipt, admit-card) (`src/features/student/fees/*`) — payment initiation pages and post-payment flows. `application_fee.tsx` and `admission-fee.tsx` prepare payment payloads and redirect or show payment gateway responses. `fee-response.tsx` handles gateway callbacks or responses. `fee_reciept.tsx` and `admit-card.tsx` render receipts and admit-cards using `feeCollectionService` and `admittedStudentService`.

- Support (`src/features/student/support-student.tsx`) — create and view support tickets via `customerSupportService`.

## Admin pages (routes prefix: `/admin`)

- Admin Dashboard (`src/features/general/admin_dashboard.tsx`) — charts and KPIs (applications per day, verification breakdown, monthly fees). Calls `applicationService`, `applicationVerificationService`, and `feeCollectionService` to aggregate data and render charts (Recharts).

- Fee Structure (`src/features/admin/fee-structure.tsx`) — CRUD UI for admission fee structure; manages master + detail items, calculates totals/deductions, supports installments. Uses `admissionFeeStructureService` and reference lookups (`degreeService`, `courseService`, `academicYearService`, `lookupService`). Provides bulk create for multiple categories.

- Fee Collection (`src/features/admin/fee-collection.tsx`) — view and manage fee collections, filter by status, export lists; interacts with `feeCollectionService`.

- Receipt Entry & Admin Receipt (`src/features/admin/reciept-entry.tsx`, `admin_fee_reciept.tsx`) — manual receipt entry and printing of receipts; uses `receiptSequenceService` and `feeCollectionService`.

- Admit Students (`src/features/admin/admit-students.tsx`) — admit student workflow; uses `admittedStudentService` to create admitted records and search by application.

- Document Verification (`src/features/admin/document-verification.tsx`) — list pending documents and mark verification status; uses `applicationVerificationService`.

- University Management, Reports, Audits, Support Admin (`src/features/admin/university-management.tsx`, `reports.tsx`, `audits.tsx`, `support-admin.tsx`) — CRUD pages for degrees/universities, report generation, audit viewing and admin tickets (corresponding services: `degreeService`, `universityService`, `reportService`, `auditService`, `customerSupportService`).

## Shared components & behaviors

- App Layout (`src/components/layouts/AppLayout`) — common page chrome (sidebar, header) used on protected admin/student pages.
- UI primitives (`src/components/ui/*`) — Input, Button, Toast, SearchableSelect, FilterPanel, Card used across pages.
- Auth guard — routes under `/admin` and `/student` expect an authenticated user and rely on token presence in `localStorage` and axios header. Role-based navigation is derived from `/login` response.
- Services (`src/services/*`) — thin wrappers around API endpoints (axios client). Typical pattern: call service, show loading state, handle errors, refresh lists after create/update/delete.

## How pages handle forms and validation
- Forms use local component state and helper validate functions (e.g., registration and login enforce password rules, application validates required fields).
- File uploads use `FormData` and `multipart/form-data` endpoints (e.g., application photos/documents). Pages preview files and call file download endpoints to stream binary responses.
- Confirmation flows: destructive actions use `confirm()` or modal dialogs, then call delete endpoints and refresh lists.

## Running and testing the frontend locally

```bash
cd frontend/web
npm install
npm start
```

Ensure `backend` API runs and `appsettings` / CORS are configured to allow frontend origin. The frontend attaches the `Authorization` bearer token to axios after login.

## Next steps (optional)
- Generate per-page markdown files with sample request/response payloads and example screenshots.
- Add a top-level frontend README linking each page doc and listing environment variables in `.env.development`.
