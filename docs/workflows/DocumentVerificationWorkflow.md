# Document Verification Workflow

---

## Overview

This document describes the end-to-end flow for an admin to verify a student's documents, from page load through to marking the application as Accepted, Rejected, or Pending/On Hold.

---

## Step 1 — Page Load

```
Admin navigates to /admin/document-verification

Browser fires 3 parallel API calls:
  ├── POST /api/ApplicationQuery/filter         → application list with embedded data
  ├── GET  /api/ApplicationVerification         → current verification statuses
  └── (on first load only) GET /api/AcademicYear + GET /api/Degree + GET /api/Course
                                                + GET /api/Lookup?type=Category
                                                + GET /api/Lookup?type=Verification

Table renders with:
  - Student name, application number, degree, course, quota
  - Status badge derived from ApplicationVerification records
```

---

## Step 2 — Search and Filter

Admin can narrow the table using:

| Filter | Type | Behaviour |
|--------|------|-----------|
| Search box | Client-side | Matches application number or student name |
| Degree | Server-side | Passed to filterApplications API |
| Course | Server-side | Passed to filterApplications API |
| Category | Server-side | Passed to filterApplications API |
| Status | Client-side | Filters by Accepted / Rejected / Pending on already-loaded data |

---

## Step 3 — Open Student Modal

```
Admin clicks "View" on a table row

GET /api/ApplicationQuery/full?appNo={applicationNo}

Response includes:
  ├── application        → student name, email, phone, address, categoryId
  ├── courseDetails      → degreeId, courseId, batchId, previousRegistrationNo
  ├── documents          → uploaded document list
  ├── feePayments        → all SUCCESS online payments
  ├── manualFeePayments  → manual payment records
  └── verification       → current verification status and installment

Modal displays:
  ├── Student Information panel
  ├── Course Information panel (+ batch year label if batchId present)
  ├── Application Fee card (Paid / Waived / Not Paid)
  ├── Admission Fee card  (payments list or "Not Paid")
  ├── Current verification status (if exists)
  ├── Uploaded documents list
  └── Verification action buttons
```

---

## Step 4 — View Documents

For each uploaded document in the modal:
- **View button** → `GET /api/ApplicationDocument/{id}/open` — opens file in new tab
- **Download button** → `GET /api/ApplicationDocument/{id}/download` — triggers download
- **View Application button** → generates the full application PDF

---

## Step 5 — Verify Application

```
Admin enters a remark (required for Rejected and Pending/On Hold)
Admin clicks Accepted / Rejected / Pending/On Hold

If first time:
  POST /api/ApplicationVerification
  Body: { applicationId, appNo, verificationStatus, remark }

If updating existing:
  PUT /api/ApplicationVerification/{id}
  Body: { id, applicationId, appNo, verificationStatus, remark }

On success:
  - Table row status badge updates immediately (no page reload)
  - Modal closes
```

### Accepted Gate

The "Accepted" button is **disabled** unless one of these is true:
- A SUCCESS payment exists with `feeType` containing "Application Fee"
- The student has a `previousRegistrationNo` (lateral entry — fee waived)

---

## Step 6 — Approve Installment (post-acceptance only)

Visible only after an application has been marked Accepted.

```
Admin clicks "Approve Installment"

PUT /api/ApplicationVerification/{id}
Body: { ...existingVerification, installment: 2 }

On success:
  - Button changes to "Remove Installment"
  - Local row state updated

Admin can reverse with "Remove Installment":
  PUT /api/ApplicationVerification/{id}
  Body: { ...existingVerification, installment: 0 }
```

---

## Step 7 — View Receipt (Fee Collection context)

From the Fee Collection page (`/admin/fee-collection`):

```
Admin clicks "View" in the Receipt column for a SUCCESS row

Opens new tab: /admin/fee-receipt?receipt={receiptNumber}

Admin Fee Receipt page loads:
  ├── GET /api/FeeCollection/admin/receipt/{receiptNumber}
  │       → fee record (amount, feeType, applicationNo, status)
  ├── GET /api/ApplicationQuery/full?appNo={applicationNo}
  │       → student's categoryId + courseDetails
  │       GET /api/AcademicYear  (parallel)
  ├── GET /api/Degree/{degreeId}           ┐
  │   GET /api/Course/{courseId}           ├ parallel
  │   GET /api/AdmissionFeeStructure/...   ┘
  │       → fee particulars filtered by installment1/installment2 flags
  └── Receipt renders with Print button
```

---

## Fee Type → Particulars Logic

| `feeType` value | Particulars shown |
|-----------------|-------------------|
| contains "Installment 1" | Fee structure rows where `installment1 = true`, using `installment1Amount` |
| contains "Installment 2" | Fee structure rows where `installment2 = true`, using `installment2Amount` |
| contains "Admission Fee" (no installment) | All fee structure rows, using `amount` |
| Application Fee | No particulars table shown |

If `fee.amount > sum of particulars amounts`, the difference is shown as a Late Fine row.

---

## API Summary

| Step | Method | Endpoint |
|------|--------|----------|
| Load list | POST | `/api/ApplicationQuery/filter` |
| Load verifications | GET | `/api/ApplicationVerification` |
| Open modal | GET | `/api/ApplicationQuery/full?appNo=` |
| View document | GET | `/api/ApplicationDocument/{id}/open` |
| Create verification | POST | `/api/ApplicationVerification` |
| Update verification | PUT | `/api/ApplicationVerification/{id}` |
| View receipt (admin) | GET | `/api/FeeCollection/admin/receipt/{receiptNumber}` |
| Fee structure | GET | `/api/AdmissionFeeStructure/filter` |
