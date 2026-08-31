# Landing Page

- Route: `/`
- Source: `frontend/web/src/features/general/landing.tsx`

Purpose:
- Public marketing / information page that explains the application steps, programmes offered, eligibility, and provides entry points to login/registration.

Key behaviors:
- Polls `notificationService.getNotifications()` every 30s and shows a toast for new notifications.
- Smooth-scroll navigation to page sections (`#home`, `#admission`, `#notification`, `#contact`).
- Links to `/login` and `/registration`.

UI and data:
- Displays programme cards, eligibility table, and steps to apply.
- Uses `Card` and `Toast` UI components.

Notes:
- Public page; errors from notifications are swallowed to avoid breaking UX.
