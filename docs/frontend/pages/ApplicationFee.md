
# Application Fee Page

- Route: `/student/application-fee`
- Source: `frontend/web/src/features/student/fees/application_fee.tsx`

Purpose
- Let a logged-in applicant pay the application fee (one-time) through the configured payment provider and view receipts when payment succeeds.

High-level workflow
1. Load student application context
	- Calls `/ApplicationQuery/my` to fetch the current user's full application and related metadata.
2. Determine fee amount
	- Reads course selection via `/ApplicationCourseDetail/application/{applicationId}` and fetches `Course` and `Degree` to determine `applicationFee`.
	- If the user's category is `SC` or `ST`, a fixed concession fee is used (`SC_ST_FEE` client-side constant).
3. Check existing payments
	- Calls `/FeeCollection/application/{applicationId}` to see if a successful `Application Fee` payment already exists; if yes, show receipt and skip payment.
4. Initiate payment
	- Generate a backend receipt number: GET `/ReceiptSequence/generate`.
	- Create a pre-payment FeeCollection record: POST `/FeeCollection` with `applicationId`, `applicationNo`, `feeType`, `amount`, `platformCharges`, `receiptNumber`.
	- Create a payment link via the payment provider helper: POST `/Easebuzz/create-payment-link` which returns `paymentUrl`.
	- Store the receipt (e.g., in `localStorage` as `easebuzz_receipt`) and redirect the browser to `paymentUrl`.
5. Post-payment
	- The payment provider calls backend webhooks to update the FeeCollection (not handled in this page). The frontend uses the `fee-receipt` or `fee-response` pages to display the final status by fetching `/FeeCollection/receipt/{receiptNo}`.

Client-side behaviors & rules
- Platform fee: a fixed `PLATFORM_FEE` (client constant) is added to the displayed payable amount.
- SC/ST override: if the user's category lookup matches `SC` or `ST`, the UI shows a reduced `SC_ST_FEE` instead of the course's applicationFee.
- Prevent duplicate payments: the page checks prior successful FeeCollection entries on load and shows a paid state when found.
- Stores `easebuzz_receipt` before redirect so the receipt page can find the most recent payment after return.

APIs used by this page (service → HTTP endpoint)
- `applicationQueryService.getMyFullApplication()` → GET `/ApplicationQuery/my` — fetch student's full application payload.
- `lookupService.getLookupsByType('Category'|'Nationality')` → GET `/Lookup/type/{type}` — lookup lists used to resolve category/nationality names.
- `feeCollectionService.getFeesByApplicationId(applicationId)` → GET `/FeeCollection/application/{applicationId}` — retrieve existing fee payments for the application.
- `applicationCourseDetailService.getCourseDetailsByApplicationId(applicationId)` → GET `/ApplicationCourseDetail/application/{applicationId}` — course selection details (degreeId, courseId, batch).
- `degreeService.getDegreeById(id)` → GET `/degree/{id}` — degree metadata.
- `courseService.getCourseById(id)` → GET `/courses/{id}` — course metadata (including `applicationFee`).
- `receiptSequenceService.generateReceiptNumber()` → GET `/ReceiptSequence/generate` — backend-generated unique receipt number.
- `feeCollectionService.createFeeCollection(payload)` → POST `/FeeCollection` — create a pre-payment record.
- `easebuzzService.createPaymentLink(payload)` → POST `/Easebuzz/create-payment-link` — returns `{ paymentUrl }` for redirection.

Notes & recommendations
- The canonical fee computation should reside on the backend to avoid client/server mismatch — frontend may display server-provided totals when available.
- Add idempotency checks on the `createFeeCollection` endpoint to avoid duplicate records from repeated clicks.
- Ensure backend payment webhook updates `FeeCollection` status and that `GET /FeeCollection/receipt/{receiptNo}` is available for the receipt page.

