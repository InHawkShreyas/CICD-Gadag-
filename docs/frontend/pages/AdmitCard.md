# Admit Card Page

- Route: `/student/admit-card`
- Source: `frontend/web/src/features/student/fees/admit-card.tsx`

Purpose:
- Display and allow download/print of provisional admit cards after successful admission fee payment.

Key behaviors:
- Fetches admitted student data via `admittedStudentService.getByApplicationId()` or `admittedStudentService.getByUsername()`.
- Renders admit-card UI and exposes print/download functionality.
