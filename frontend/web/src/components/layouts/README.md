# Layout System Documentation

## Overview

This is a complete layout system with configurable sidebar, header, and responsive design for the MGRDPR University portal. It supports different user types (student, university admin, and system admin) with customizable menu configurations.

## Components

### 1. **AppLayout** (Main Wrapper)
The main layout component that combines everything together.

```tsx
import { AppLayout } from '@/components/layouts';

<AppLayout
  userType="student"
  pageTitle="My Dashboard"
  userName="John Doe"
  userRole="Student"
>
  {/* Your page content */}
</AppLayout>
```

**Props:**
- `userType`: 'student' | 'university' | 'admin' (default: 'student')
- `pageTitle`: Page title displayed in header (default: 'Dashboard')
- `userName`: User's name displayed in profile dropdown (default: 'John Doe')
- `userRole`: User's role displayed in header (default: 'Student')
- `children`: Your page content

### 2. **Sidebar**
Collapsible navigation sidebar with menu items.

**Features:**
- Collapsible/expandable with toggle button
- Menu items with icons and badges
- Active state highlighting
- Smooth animations
- Logout button at bottom
- Scrollable menu area

### 3. **Header**
Top navigation bar with user profile and actions.

**Features:**
- Page title display
- Notification bell with badge
- Settings button
- User profile dropdown
- Responsive mobile menu toggle
- User role display

### 4. **layoutConfig.ts**
Configuration file for menu items.

## Menu Configuration

### Adding/Editing Menu Items

Edit `layoutConfig.ts` to customize menus:

```typescript
export const layoutConfig: LayoutConfig = {
  studentMenu: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/student/dashboard',
      badge: 3, // Optional badge number
    },
    // ... more items
  ],
  universityMenu: [
    // ... university menu items
  ],
  adminMenu: [
    // ... admin menu items
  ],
};
```

**Menu Item Properties:**
- `id`: Unique identifier
- `label`: Menu item display name
- `icon`: Lucide React icon component
- `path`: Navigation path
- `badge`: Optional badge (number or string)
- `children`: Optional submenu items

## User Types & Menus

### 1. **Student Menu**
- Dashboard
- My Courses (with badge)
- Schedule
- Assignments (with badge)
- Grades
- Attendance
- Fees
- Messages (with badge)
- Profile
- Settings

### 2. **University/Admin Menu**
- Dashboard
- Students (with badge count)
- Faculty (with badge count)
- Courses (with badge)
- Schedule Management
- Attendance
- Grades & Results
- Finances
- Reports
- Notifications (with badge)
- Settings

### 3. **System Admin Menu**
- Dashboard
- User Management (with badge)
- Universities
- Reports
- System Settings

## Usage Examples

### Example 1: Student Dashboard
```tsx
import { AppLayout } from '@/components/layouts';

export default function StudentDashboard() {
  return (
    <AppLayout
      userType="student"
      pageTitle="My Dashboard"
      userName="Rahul Kumar"
      userRole="Student - BCA"
    >
      <div>
        <h2>Welcome to your dashboard!</h2>
        {/* Your content */}
      </div>
    </AppLayout>
  );
}
```

### Example 2: University Admin Panel
```tsx
import { AppLayout } from '@/components/layouts';

export default function UniversityDashboard() {
  return (
    <AppLayout
      userType="university"
      pageTitle="University Dashboard"
      userName="Dr. Ramesh"
      userRole="University Admin"
    >
      <div>
        <h2>Manage your university</h2>
        {/* Your content */}
      </div>
    </AppLayout>
  );
}
```

### Example 3: System Admin Panel
```tsx
import { AppLayout } from '@/components/layouts';

export default function AdminDashboard() {
  return (
    <AppLayout
      userType="admin"
      pageTitle="System Admin"
      userName="Admin User"
      userRole="System Administrator"
    >
      <div>
        <h2>Manage the system</h2>
        {/* Your content */}
      </div>
    </AppLayout>
  );
}
```

## Features

✅ **Responsive Design**
- Works on desktop, tablet, and mobile
- Sidebar collapses on desktop with toggle
- Mobile drawer menu

✅ **Customizable Menus**
- Different menus for different user types
- Easy to add/remove/edit menu items
- Support for badges and icons

✅ **User Profile Management**
- Profile dropdown with logout
- Display user name and role
- Quick access to settings

✅ **Notifications**
- Notification bell with badge
- Hover tooltips
- Quick access to settings

✅ **Smooth Animations**
- Sidebar collapse/expand animation
- Menu hover effects
- Dropdown animations
- Transition effects

✅ **Accessibility**
- Semantic HTML
- Proper contrast ratios
- Keyboard navigation support

## Color Scheme

Uses the configured colors from tailwind config:
- **Primary**: #820000 (dark red) - Headers and accents
- **Secondary**: #4e6c50 (dark green) - Sidebar background
- **Accent**: #f2deba (light beige) - Highlights
- **Text**: #130000 (dark brown) - Main text
- **Background**: #f8f2f2 (light beige) - Page background

## Customization

### Change Sidebar Colors
Edit the `bg-secondary` class in `Sidebar.tsx` to change sidebar background color.

### Add New Menu Items
1. Go to `layoutConfig.ts`
2. Add item to appropriate menu array (studentMenu, universityMenu, or adminMenu)
3. Import the icon from lucide-react
4. Set the path and label

### Modify Header
Edit `Header.tsx` to:
- Change notification functionality
- Add more user actions
- Customize profile dropdown

### Update Sidebar Styling
Edit `Sidebar.tsx` to:
- Change collapse width
- Modify menu item styling
- Customize hover effects

## File Structure

```
/components/layouts/
├── AppLayout.tsx          # Main wrapper component
├── Sidebar.tsx            # Sidebar navigation
├── Header.tsx             # Top navigation header
├── layoutConfig.ts        # Menu configurations
├── LayoutExample.tsx      # Usage examples
├── index.ts               # Exports
└── README.md              # This file
```

## Integration with Routes

Update your AppRoutes.tsx to use AppLayout:

```tsx
import { AppLayout } from '@/components/layouts';

<Route 
  path="/student/dashboard" 
  element={
    <AppLayout userType="student" pageTitle="Dashboard">
      <StudentDashboard />
    </AppLayout>
  } 
/>
```

## Common Issues & Solutions

### Issue: Sidebar not collapsing
**Solution**: Check that `sidebarCollapsed` state is properly managed in AppLayout

### Issue: Menu items not navigating
**Solution**: Ensure paths in layoutConfig match your route definitions

### Issue: Wrong menu displayed
**Solution**: Verify `userType` prop is correctly set

### Issue: Responsive issues on mobile
**Solution**: Check that Tailwind CSS is properly configured with breakpoints

## Future Enhancements

- [ ] Add submenu support with expandable items
- [ ] Add breadcrumb navigation
- [ ] Add search functionality in header
- [ ] Add dark mode support
- [ ] Add animation transitions
- [ ] Add keyboard shortcuts
- [ ] Add role-based access control (RBAC)
- [ ] Add sidebar favorites/pinned items

## License

This layout system is part of the MGRDPR University portal.

## Support

For issues or questions, please refer to the LayoutExample.tsx file or create an issue in the project repository.
