# Receipt Entry (Admin)

- Route: `/admin/receipt`
- Source: `frontend/web/src/features/admin/reciept-entry.tsx`

Purpose
- Provide finance/admin staff an interface to create manual receipt entries, apply adjustments, and record offline/cash/bank payments against existing applications or student accounts.

High-level workflow
1. Start new receipt
	- Admin clicks "New Receipt" which requests a unique receipt number from the backend: GET `/ReceiptSequence/generate`.
2. Select application or student
	- Admin searches by `applicationNo`, `studentId`, or `receiptNo` using GET `/FeeCollection/application/{applicationId}` or search endpoints to retrieve pending dues and past payments.
3. Enter payment details
	- Fill payer details, payment mode (Cash/NEFT/Cheque), bank details (if applicable), amount, and optionally split the amount across fee heads.
4. Validate and submit
	- Client-side validation: ensure amount matches selected dues and required bank fields for non-cash modes.
	- Submit via POST `/FeeCollection/manual` (or POST `/FeeCollection` with `isManual=true`) to persist the manual payment and mark invoice/dues accordingly.
5. Print / receipt
	- On successful save, page shows printable receipt and an option to generate a PDF. The record is searchable via `/FeeCollection/receipt/{receiptNo}`.

UI behaviors & details
- Show outstanding dues and allow allocating the entered payment to specific fee items (tuition, lab, fine, etc.).
- Support partial payments and show remaining balance after entry.
- Validation: require bank transaction/reference numbers for non-cash payments; display warnings for over-payments.
- Audit information (who entered the receipt and when) should be visible on saved receipts.

APIs used by this page (service → HTTP endpoint)
- `receiptSequenceService.generateReceiptNumber()` → GET `/ReceiptSequence/generate` — obtain next receipt number.
- `feeCollectionService.getFeesByApplicationId(applicationId)` → GET `/FeeCollection/application/{applicationId}` — fetch dues and historical payments for allocation.
- `feeCollectionService.createManualFeeCollection(payload)` → POST `/FeeCollection` (with `isManual=true`) — save manual/offline payment record.
- `feeCollectionService.getByReceiptNumber(receiptNo)` → GET `/FeeCollection/receipt/{receiptNo}` — retrieve a single receipt for printing/verification.
- `studentService.search(query)` → GET `/student/search?q=...` — optional helper to find student/application records.

Operational recommendations
- Use a dedicated `isManual` flag on saved `FeeCollection` records so reports can distinguish manual entries from gateway-driven payments.
- Enforce server-side validation and idempotency to prevent duplicate manual receipts (e.g., check unique `transactionRef` for bank NEFT/cheque entries).
- Log audit entries (`createdBy`, `createdAt`, `verifiedBy`) and surface them on the receipt page.
- Add role-based access control: restrict in-production manual receipt creation to finance roles.

Example request/response (suggested)
- Request: POST `/FeeCollection` with body `{ "applicationId": 123, "amount": 5000, "mode": "NEFT", "transactionRef": "TX123", "isManual": true, "receiptNumber": "RCPT-2026-0001", "items": [{"feeHeadId": 1, "amount": 3000}, {"feeHeadId":2, "amount":2000}] }`
- Response: `{ "id": 987, "receiptNumber": "RCPT-2026-0001", "status": "Paid", "createdAt": "2026-06-02T10:00:00Z" }`

Next improvements
- Add bulk import for offline bank remittances (CSV of NEFT/RTGS transactions) which maps to `applicationNo` and auto-creates receipts pending reconciliation.
- Add reconciliation UI to match gateway payouts to recorded manual entries.

