
# Admission Fee Page

- Route: `/student/admission-fee`
- Source: `frontend/web/src/features/student/fees/admission-fee.tsx`

Purpose
- Allow a logged-in student to view the applicable admission fee (full or installment), pay it using the configured payment provider (Easebuzz), and view receipts/admit-cards.

High-level workflow (what the page does)
1. Load student context and application
	- Calls the API to get the student's full application and related course details.
2. Resolve program & fee structure
	- Reads the student's selected course/degree and category and calls the fee-structure API (`/AdmissionFeeStructure/by-filters`) to resolve the applicable fee master and its detail lines.
3. Fetch verification & past payments
	- Retrieves verification status (to determine if installment mode is enabled) and previously paid fee records for the application.
4. Compute amounts shown to user
	- If installment mode is enabled (installmentCount === 2), compute installment1 and installment2 totals from fee detail lines; otherwise show full fee total.
	- Apply late fines and a small platform charge for `USN` users according to client rules.
5. Payment flow
	- When user clicks Pay (installment 1 / 2 or full), the page:
	  a. Generates a receipt number from the backend (`/ReceiptSequence/generate`).
	  b. Creates a FeeCollection record (backend) with `feeType`, `amount`, `platformCharges`, and `receiptNumber` (`POST /FeeCollection`).
	  c. Calls the payment provider endpoint to get a payment URL (`POST /Easebuzz/create-payment-link`).
	  d. Stores the receipt locally (for redirect/receipt page) and redirects the browser to the payment URL.
6. Post-payment
	- Payment gateway will callback to backend; the frontend uses `fee-response` / `fee-receipt` routes to display transaction outcome and the receipt fetched from `/FeeCollection/receipt/{receiptNo}`.

Key UI & validation details
- Shows student name, appNo, programme and fee breakdown (detail lines) with installment groups when applicable.
- Shows already-paid receipts with links to the receipt view.
- Displays toasts for load/payment errors and uses a loading state while creating receipts and redirecting.

Important client-side calculations
- Installment totals: sum of detail lines where `installment1` / `installment2` is true; supports override amounts `installment1Amount` and `installment2Amount`.
- Late fine: client-side rule computed by date (constants in code) and applied conditionally based on `USN` presence and installment logic.
- Platform fee: a small fixed charge (`USN_PLATFORM_FEE = 90`) applied for certain users.

APIs used by this page (service → HTTP endpoint)
- `applicationQueryService.getMyFullApplication()` → GET `/ApplicationQuery/my` — returns the student's full application and related data.
- `applicationCourseDetailService.getCourseDetailsByApplicationId(applicationId)` → GET `/ApplicationCourseDetail/application/{applicationId}` — course selection and batch info.
- `courseService.getCourseById(id)` → GET `/courses/{id}` — fetch course metadata.
- `degreeService.getDegreeById(id)` → GET `/degree/{id}` — fetch degree metadata.
- `lookupService.getLookupsByType(type)` → GET `/Lookup/type/{type}` — lookup lists for categories and nationalities.
- `admissionFeeStructureService.getFeeByFilters(degreeId, courseId, categoryId, academicYearId)` → GET `/AdmissionFeeStructure/by-filters?degreeId=...&courseId=...&categoryId=...&academicYearId=...` — resolves fee master + detail lines.
- `applicationVerificationService.getApplicationVerificationByAppNo(appNo)` → GET `/ApplicationVerification/by-app-no/{appNo}` — verification status and installment configuration.
- `feeCollectionService.getFeesByApplicationId(applicationId)` → GET `/FeeCollection/application/{applicationId}` — previously paid fee records.
- `receiptSequenceService.generateReceiptNumber()` → GET `/ReceiptSequence/generate` — backend-generated unique receipt number.
- `feeCollectionService.createFeeCollection(payload)` → POST `/FeeCollection` — create a fee-collection record before redirecting to payment.
- `easebuzzService.createPaymentLink(payload)` → POST `/Easebuzz/create-payment-link` — returns `{ paymentUrl }` where the frontend redirects the user to complete payment.
- `registrationService.getRegistrationByUsername(username)` → GET `/registration/{username}` — used to detect `usnNo` presence for platform fees/late fine logic.
- `academicYearService.getAcademicYears()` → GET `/AcademicYear` — used when fee lookup needs academic year context.

Notes & operational considerations
- The page expects the user to be authenticated and relies on `localStorage` keys (`username`) and axios `Authorization` header for authenticated API calls.
- Payment redirection is delegated entirely to Easebuzz's `paymentUrl`; the backend must update the FeeCollection record after receiving payment confirmation from gateway webhooks.
- The frontend stores `easebuzz_receipt` in `localStorage` before redirect so the receipt page can locate the recent transaction after redirection.

Next improvements you might consider
- Display server-side computed breakdown as a canonical source (to avoid client-side mismatches) and reduce duplicated fee logic between client and server.
- Add retry and idempotency handling for `createFeeCollection` so duplicated clicks don't create multiple records.
- Add integration tests simulating payment flow (create fee collection → simulate gateway callback → verify receipt retrieval).

