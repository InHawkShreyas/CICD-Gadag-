# Admit Students (Admin)

- Route: `/admin/admit-students`
- Source: `frontend/web/src/features/admin/admit-students.tsx`

Purpose:
- Admit student workflow for creating admitted student records after verification.

Key behaviors:
- Uses `admittedStudentService.create()` and `admittedStudentService.getByApplicationId()` to admit students and manage admission remarks.
