# PBL5-Mobile (React Native)

Mobile app converted from `PBL5-FE` to React Native (Expo), aligned to `PBL5-BE` APIs.

## Stack

- Expo + React Native
- React Navigation (Stack + Bottom Tabs)
- Axios
- AsyncStorage for JWT/session

## Run

```bash
npm install
npm run start
```

## API Base URL

Configured at `src/constants/config.js`:

- Android emulator: `http://10.0.2.2:8000/api`

If testing on physical device, replace with your LAN IP, for example:

- `http://192.168.1.10:8000/api`

Recommended setup for Expo Go on physical device:

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to your machine LAN IP, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000/api
```

3. Restart Metro with cache clear:

```bash
npx expo start -c
```

## Implemented Screens

- Home
- Login
- Profile
- Leave Management
- Attendance History
- Attendance Check-in / Check-out
- My Shifts
- Face Registration (endpoint wired, image picker pending)
- Employees Management (admin)
- Department Management (admin)
- Shifts Management (admin/manager)
- Reports (admin/manager)
- Work Rules (static)
- Overtime Request (placeholder because backend route not exposed)

## Backend Alignment Notes

- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`
- Employees/Departments: `/api/employees`, `/api/departments`
- Attendance: `/api/attendance`, `/api/attendance/check-in`, `/api/attendance/check-out`, `/api/attendance/today`
- Leaves: `/api/leave-types`, `/api/leaves`, `/api/leaves/{id}/approve`, `/api/leaves/{id}/reject`
- Shifts: `/api/shifts`, `/api/shifts/assign`
- Reports: `/api/reports/monthly`
- Face: `/api/face/enroll`

## Important

Some create/update payloads may need small adjustments based on your exact serializer fields in BE. The app structure is ready to refine those payloads quickly.
