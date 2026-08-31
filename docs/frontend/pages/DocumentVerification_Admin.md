
# Document Verification (Admin)

- Route: `/admin/document-verification`
- Source: `frontend/web/src/features/admin/document-verification.tsx`

Purpose
- Provide university staff an interface to review applicant uploaded documents (supporting documents and photos), accept/reject them with remarks, and record the verification outcome in the system.

High-level workflow
1. List pending items
	- The page loads a list of applications/documents that require verification by calling the backend verification and document APIs.
2. Inspect documents
	- For each application, the reviewer can open document metadata and download/view the actual file using the document download endpoint.
3. Make decision
	- Reviewer marks the document/application as `Accepted`, `Rejected`, or `Pending` and can add reviewer remarks and set installment flags where applicable.
4. Persist verification
	- The page creates or updates an `ApplicationVerification` record via POST/PUT to the verification API, which keeps a record of status, remark and installment configuration.
5. Notifications & follow-ups
	- Optionally trigger notifications (SMS/email) from backend workflows or queue follow-up actions (e.g., move application to admit flow, notify student to re-upload documents).

UI behavior & details
- Shows a per-application list with quick filters (pending, accepted, rejected) and search by application number.
- Document preview thumbnails (for images) and download links for PDF/other formats use the document download API.
- Verification modal/side-panel includes: list of documents, reviewer remarks textbox, status selector and a Save button.
- After save, list refreshes and audit entries (if enabled) capture who verified and when.

APIs used by this page (service → HTTP endpoint)
- `applicationVerificationService.getApplicationVerifications()` → GET `/ApplicationVerification` — list all verification records (admin view).
- `applicationVerificationService.getApplicationVerificationByAppNo(appNo)` → GET `/ApplicationVerification/by-app-no/{appNo}` — fetch a verification record for a specific application.
- `applicationVerificationService.createApplicationVerification(payload)` → POST `/ApplicationVerification` — create a verification record (status, remark, installment).
- `applicationVerificationService.updateApplicationVerification(payload)` → PUT `/ApplicationVerification` — update an existing verification record.
- `applicationDocumentsService.getAll()` → GET `/application-documents` — list uploaded application documents (or use `ApplicationQuery/full` to get documents grouped by application).
- `applicationDocumentsService.getByApplicationId(applicationId)` → GET `/application-documents/by-app-id/{applicationId}` — get documents for a specific application.
- `applicationDocumentsService.download(id)` → GET `/application-documents/download/{id}` — download a document file for preview or verification.
- `applicationDocumentController.delete(id)` → DELETE `/application-documents/{id}` — remove a document if marked invalid (admin action).
- `applicationQueryService.getFullApplicationByAppNo(appNo)` → GET `/ApplicationQuery/full?appNo=...` — optionally used to show full application context when verifying.

Operational considerations
- Idempotency: ensure repeated save actions don't create duplicate verification records — prefer server-side dedup by `applicationId`.
- Audit trail: verification is a sensitive admin action; enable `AuditLog` entries and show them in the admin UI (`/admin/audits`).
- File access: document downloads should be proxied/authenticated by the backend and respect access controls.
- Notifications: the backend should be the source of truth for sending SMS/email notifications after verification (avoid letting frontend directly call notification providers).

Next improvements
- Add a bulk-verify action for batch-accepting documents for a successful day of verification.
- Add inline image zoom and PDF viewer to improve reviewer ergonomics.
- Add automated heuristics (e.g., file name/content checks) to pre-flag likely invalid uploads.

