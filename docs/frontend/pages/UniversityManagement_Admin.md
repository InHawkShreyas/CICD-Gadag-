# University Management (Admin)

- Route: `/admin/university-management`
- Source: `frontend/web/src/features/admin/university-management.tsx`

Purpose
- Administrative UI to manage core university catalog entities such as `University` records, `Degrees`, `Courses`, `AcademicYears`, `Campuses`, `Departments`, and related configuration (seat types, intake capacities). This area centralizes administrative metadata required across admission and fee flows.

High-level workflow
1. Load catalog entities
	- On page load, fetch lists for Universities, Degrees, Courses, Campuses, Departments, and Academic Years to populate tables and creation dialogs.
2. Create / update entities
	- Admin opens a form to create or edit an entity (for example, a `Course`), fills fields and saves. The form posts data to the corresponding API and updates the list on success.
3. Soft delete / restore
	- Admin can soft-delete entries; deleted entries remain in the DB with a `deleted` flag and can be restored if necessary.
4. Cross-entity links
	- Course creation often requires selecting a `Degree` and `AcademicYear`; the UI enforces referential integrity and displays human-readable names.

UI behavior & details
- Table-driven lists with paging, sorting, and search across entity fields (name, code, status).
- Detail modal or side-panel for create/edit with client-side validation (required fields, codes unique client-side check) and helpful dropdowns populated by lookup endpoints.
- Bulk actions: bulk import (CSV), bulk soft-delete, and bulk-restore for large catalogs.
- Relationship visualizations: show which `Courses` belong to a `Degree`, and which `Departments` are mapped to `Campuses`.

APIs used by this page (service → HTTP endpoint)
- `universityService.getAll()` → GET `/university` — list universities.
- `universityService.create(payload)` → POST `/university` — create university.
- `universityService.update(payload)` → PUT `/university` — update university.
- `degreeService.getAll()` → GET `/degree` — list degrees.
- `degreeService.create(payload)` → POST `/degree` — create degree.
- `courseService.getAll()` → GET `/courses` — list courses.
- `courseService.create(payload)` → POST `/courses` — create course.
- `academicYearService.getAll()` → GET `/AcademicYear` — list academic years.
- `campusService.getAll()` → GET `/campus` — list campuses.
- `departmentService.getAll()` → GET `/department` — list departments.
- `seatTypeService.getAll()` → GET `/seat-type` — list seat types and intake capacities.

Operational recommendations
- Validation & constraints: enforce unique codes server-side and validate referential integrity when dependent entities are created or deleted.
- RBAC: restrict management actions to `admin` or `registrar` roles and log actions for auditability.
- Soft deletes: use `isDeleted` or `status` flags to hide records from public flows instead of hard deletes.
- Bulk import/export: provide CSV templates and server-side validation endpoints to allow safe batch operations.
- Referential cleanup: prevent deleting referenced entities without first unlinking or transferring references (e.g., courses with active applications should be blocked from being removed).

Example payloads
- Create Degree (POST `/degree`)

```json
{
  "name": "Bachelor of Science",
  "code": "BSC",
  "durationYears": 3,
  "credits": 120,
  "createdBy": "admin.user"
}
```

- Create Course (POST `/courses`)

```json
{
  "name": "BSc Computer Science",
  "code": "BSC-CS",
  "degreeId": 12,
  "academicYearId": 2026,
  "seatCapacity": 120,
  "departmentId": 5,
  "createdBy": "admin.user"
}
```

Next improvements
- Add a graph view showing relationships between `Degrees`, `Courses`, and `AcademicYears`.
- Add role-scoped UI: show advanced fields only to super-admins (e.g., legacy migration flags).

