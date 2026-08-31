# Fee Receipt Workflow

---

## Overview

There are two receipt pages in the system — one for students and one for admins. They use different API endpoints because the student endpoint is scoped to the logged-in user's username, while the admin endpoint looks up by receipt number alone.

---

## Student Receipt (`/student/fee-receipt`)

Accessed by a logged-in student from their fee dashboard.

```
GET /api/FeeCollection/receipt/{receiptNumber}
  → Requires: JWT with matching username claim
  → Returns: fee record only if it belongs to the logged-in student
  → 401 if no username in JWT
  → 404 if receipt exists but belongs to a different user
```

Uses `getMyFullApplication()` to get the student's own application data for degree, course, and fee structure.

---

## Admin Receipt (`/admin/fee-receipt?receipt={receiptNumber}`)

Accessed by an admin from the Fee Collection table or Document Verification modal.

```
GET /api/FeeCollection/admin/receipt/{receiptNumber}
  → Requires: valid JWT (any authenticated admin)
  → Returns: fee record regardless of which student it belongs to
  → 404 only if receipt number does not exist
```

Uses `getFullApplicationByAppNo(feeData.applicationNo)` to get the student's application data with the correct `categoryId` for fee structure lookup.

---

## Why Two Endpoints

| | Student endpoint | Admin endpoint |
|-|-----------------|----------------|
| Route | `/receipt/{receiptNumber}` | `/admin/receipt/{receiptNumber}` |
| Auth | `[AllowAnonymous]` + username check | `[Authorize]` |
| Username filter | Yes — scoped to logged-in student | No |
| Use case | Student prints their own receipt | Admin views any student's receipt |

---

## Admin Receipt Load Sequence

```
1. Parse receiptNumber from URL query param (?receipt=...)

2. getFeeByReceiptAdmin(receiptNumber)
   → GET /api/FeeCollection/admin/receipt/{receiptNumber}
   → Populates: amount, paidAmount, platformCharges, feeType,
                applicationNo, status, transactionId, orderId,
                receiptNumber, paymentDate, name

3. (parallel)
   getFullApplicationByAppNo(feeData.applicationNo)
   → GET /api/ApplicationQuery/full?appNo=...
   → Provides: categoryId, courseDetails[0].{degreeId, courseId, batchId, previousRegistrationNo}

   getAcademicYears()
   → GET /api/AcademicYear
   → Used to resolve batchId → description (e.g. "2024-2025")

4. (parallel)
   getDegreeById(degreeId)    → degree name
   getCourseById(courseId)    → course name
   getFeeByFilters(degreeId, courseId, categoryId, batchId)
   → Returns fee structure with details[], installment flags, installment amounts

5. Filter particulars:
   - Installment 1 → details where installment1 = true
   - Installment 2 → details where installment2 = true
   - Full admission fee → all details

6. Render receipt card
```

---

## Receipt Page Layout

```
┌─────────────────────────────────┐
│  [GREEN/RED] Payment Status      │
│  Date & Time                     │
├─────────────────────────────────┤
│  [Logo] University Name          │
├─────────────────────────────────┤
│  Receipt No.  MGRDPR2627000442  │
├─────────────────────────────────┤
│  [Barcode] (SUCCESS only)        │
├─────────────────────────────────┤
│  Application No.  2627MGRDPR... │
│  Name             STUDENT NAME  │
│  Degree           B.Sc          │
│  Course           Physics       │
│  Batch            2025-2026     │
│  Fee Type         Installment 1 │
│  Amount           ₹12,350       │
│  Total Paid       ₹12,350       │
│  Status           SUCCESS       │
│  Transaction ID   E2605270...   │
├─────────────────────────────────┤
│  INSTALLMENT 1 PARTICULARS      │
│  Tuition Fee        ₹8,000      │
│  Library Fee        ₹1,500      │
│  Lab Fee            ₹2,850      │
│  ─────────────────────────────  │
│  Total Paid         ₹12,350     │
├─────────────────────────────────┤
│  [Footer disclaimer]             │
└─────────────────────────────────┘
```

---

## Print

The page includes embedded `@media print` CSS that:
- Hides the Print button and all non-receipt elements
- Renders the card at 185mm width on A4 portrait
- Forces exact colour printing for the green/red header
- Avoids page breaks inside table rows
