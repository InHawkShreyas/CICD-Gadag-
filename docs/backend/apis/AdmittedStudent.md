# Admitted Student API

- Base route: `api/AdmittedStudent` (controller uses `api/[controller]`)

Endpoints:
- `POST /api/AdmittedStudent` — Admit a student. Accepts `CreateAdmittedStudentDto`.
- `GET /api/AdmittedStudent` — Get all admitted students.
- `GET /api/AdmittedStudent/application/{applicationId}` — Get admitted student by application ID.
- `PUT /api/AdmittedStudent` — Update admitted student (remarks/admit toggle).
