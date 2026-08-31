# Admission Fee Structure API

- Base route: `api/AdmissionFeeStructure`

Endpoints:
- `POST /api/AdmissionFeeStructure` — Create fee structure (master + details). Accepts `AdmissionFeeStructure` model.
- `GET /api/AdmissionFeeStructure` — Get all fee structures.
- `GET /api/AdmissionFeeStructure/{id}` — Get fee structure by ID.
- `PUT /api/AdmissionFeeStructure` — Update fee structure (master + details). Accepts `AdmissionFeeStructure` model.
- `DELETE /api/AdmissionFeeStructure/{id}` — Soft delete fee structure.
- `GET /api/AdmissionFeeStructure/by-filters?degreeId=...&courseId=...&categoryId=...&academicYearId=...` — Get fee structure by filters.

Notes:
- Endpoints require authorization; service is `IAdmissionFeeStructureService`.
