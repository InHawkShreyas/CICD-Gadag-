# Fee Response Page

- Route: `/student/fee-response`
- Source: `frontend/web/src/features/student/fees/fee-response.tsx`

Purpose:
- Receive and display payment gateway response after a transaction; verify status and update backend records.

Key behaviors:
- Verifies transaction using `feeCollectionService.verifyPayment()` or similar service.
- Shows success, failure or pending states and links to receipt or retry.
