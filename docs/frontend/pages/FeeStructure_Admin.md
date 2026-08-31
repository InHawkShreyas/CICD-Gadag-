
# Fee Structure (Admin)

- Route: `/admin/fee-structure`
- Source: `frontend/web/src/features/admin/fee-structure.tsx`

Purpose
- Provide admin users with a UI to define, update, and manage admission fee structures per `Degree`/`Course`/`AcademicYear`/`Category`. Supports detailed line items (tuition, lab, misc), deduction rules, and installment schedules.

High-level workflow
1. Load reference data
	- Fetch `Degrees`, `Courses`, `AcademicYears`, `Categories`, and other lookup data to populate filters and selector dropdowns.
2. Search & load existing fee structures
	- Admin selects filters (degree, course, academic year, category) and calls GET `/AdmissionFeeStructure/by-filters` to load existing fee structure entries.
3. Create or update fee structure
	- Admin fills master details and line items, configures installment splits and deduction rules on the client.
	- Save triggers POST `/AdmissionFeeStructure` to create new or PUT `/AdmissionFeeStructure` to update existing structures. The backend returns saved entity IDs and canonical computed total.
4. Validation
	- Client validates totals and installment sums before sending; backend performs authoritative validation and normalization.
5. Publish & use
	- Once saved/published, frontend pages that calculate payable fees (admission fee page, fee calculator) should use `/AdmissionFeeStructure/by-filters` to obtain canonical values.

UI behavior & details
- Supports cloning an existing structure to new academic years or categories to simplify admin tasks.
- Inline calculations: UI shows running totals, per-installment amounts, and final payable after deductions.
- Row-level line items can be of types: `Tuition`, `Lab`, `Misc`, `LateFine`, etc.
- Installment configuration allows setting percentage or fixed amounts per installment.

APIs used by this page (service → HTTP endpoint)
- `admissionFeeStructureService.getFeeByFilters(filters)` → GET `/AdmissionFeeStructure/by-filters` — retrieve the fee structure for selected filters.
- `admissionFeeStructureService.createFeeStructure(payload)` → POST `/AdmissionFeeStructure` — create fee structure entries (master + details).
- `admissionFeeStructureService.updateFeeStructure(payload)` → PUT `/AdmissionFeeStructure` — update an existing fee structure.
- `degreeService.getAll()` → GET `/degree` — degrees list.
- `courseService.getAll()` → GET `/courses` — courses list.
- `academicYearService.getAll()` → GET `/AcademicYear` — academic years.
- `lookupService.getLookupsByType(type)` → GET `/Lookup/type/{type}` — categories, income groups, etc.

Operational recommendations
- Keep the canonical computation of totals and installment splits on the backend (returned on save and on `/by-filters` read) so payment flows don't diverge between client and server.
- Add a `published` flag if you want draft vs. active fee structures; admission flows should only use `published=true` structures.
- Add concurrency checks: use `RowVersion` or last-updated timestamps to prevent accidental overwrites by concurrent admins.
- Add an export/import CSV to help admins bulk-edit fee structures offline.

Example payloads (suggested)
- Request: GET `/AdmissionFeeStructure/by-filters?degreeId=...&courseId=...&academicYearId=...&category=...`
- Response: canonical fee structure JSON including `master` (meta), `items` (line items), `installments` (amounts per installment), and `total`.

