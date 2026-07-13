# EnviroGuard Frontend

## Project Overview
React Native (Expo SDK 56) mobile app for environmental hazard reporting in school campuses.

## Architecture
- `src/api/` - Axios API client with interceptors for auth token refresh
- `src/components/ui/` - Reusable UI components (Button, Input, Card, etc.)
- `src/constants/` - Theme tokens (colors, spacing, typography) and app constants
- `src/contexts/` - React Context for auth state management
- `src/navigation/` - React Navigation setup (stack + bottom tabs, role-based)
- `src/screens/auth/` - Authentication flow screens
- `src/screens/student/` - Student role screens
- `src/screens/admin/` - Admin role screens (Dashboard, Reports, Students, Faculties, Admins)
- `src/types/` - TypeScript type definitions
- `src/utils/` - Helper utilities

## Roles
- **student** - Register with OTP, submit hazard reports with images, track status
- **departmentAdmin** - Manage students (import CSV/Excel), view own-department reports (read-only)
- **facultyAdmin** - Manage department admins, view faculty students/reports, faculty analytics
- **environmentalAdmin** - Full control: manage faculty admins, reports (update status), faculties, system dashboard

## Commands
- `npm start` - Start Expo dev server
- `npm run android` - Start on Android
- `npm run ios` - Start on iOS (macOS only)
- `npx tsc --noEmit` - TypeScript check

## API
- Base URL: `http://192.168.0.101:5000/api/v1` (configured in `src/constants/index.ts`)
- Auth: Bearer token via `expo-secure-store`
- Auto-refresh on 401
