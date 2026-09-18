# EnviroGuard — Technical Structure Report

> Source of truth: the implemented source code in `envro-backend/` and `envro-frontend/`.
> Purpose: to underpin Chapter Three diagrams (Architecture, Class, ERD, Use Case, Sequence, Activity, DFD).
> Generated from a full read of the codebase. Any inconsistency with written documentation is flagged in Section 21.

---

## 1. System Overview

EnviroGuard is a campus environmental-hazard reporting system. Students submit geotagged hazard reports with photos; a four-tier administrative hierarchy reviews, assigns, and resolves them; every administrative action is audited and every state change notifies affected parties via in-app records and Expo push notifications.

**Core capabilities**
- OTP-verified student and admin registration; JWT access/refresh authentication.
- Geotagged hazard reports with Cloudinary image upload.
- Four roles with hierarchical, faculty/department-scoped access control.
- Report lifecycle: `pending → under_review → in_progress → resolved`, with status history and a chronological timeline.
- In-app notifications + push notifications via Expo.
- Immutable audit log of administrative and student actions.
- Student roster import (CSV/Excel) and departmental dashboards.

**Topology**
- Mobile/web client: React Native / Expo (SDK 56), TypeScript.
- REST API: Node.js + Express (ES modules), Mongoose/MongoDB.
- Deployment: backend on Render (`https://envroguard-tmjk.onrender.com/api/v1`); MongoDB Atlas; Cloudinary for media; Brevo for email; Expo Push service for notifications.
- The Express app can also serve the built web bundle from `public/` with an SPA fallback.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Client runtime | React Native 0.8x / Expo SDK 56, TypeScript |
| Navigation | React Navigation (native stack + bottom tabs) |
| Client state | React Context (`AuthContext`, `NetworkContext`) |
| Client HTTP | Axios with interceptors (auth, refresh queue, cold-start retry) |
| Client storage | AsyncStorage wrapper (`src/utils/storage.ts`) |
| Media upload | Cloudinary unsigned upload (base64 form POST) |
| Push (client) | `expo-notifications`, Expo push tokens |
| Server runtime | Node.js, Express 4 (ESM) |
| Database | MongoDB via Mongoose 8 |
| Auth | `jsonwebtoken` (HS256), `bcrypt` (cost 12) |
| Security | `helmet`, `cors`, `express-rate-limit`, input validation middleware |
| Email | Brevo transactional HTTP API |
| Push (server) | `expo-server-sdk` |
| Logging | Custom `logger` + `morgan` |
| API docs | Swagger (`config/swagger.js`, mounted in `app.js`) |
| File parsing | CSV/Excel import middleware |
| Container/CI (aux) | `k6/` load tests, `security-tests/` evidence |

---

## 3. Project Structure

### 3.1 Backend (`envro-backend/src`)

```
src/
  app.js                     Express app: security, CORS, routes, static SPA, errors
  server.js                  HTTP bootstrap
  config/
    index.js                 dotenv config (jwt, otp, email, rateLimit, allowedOrigins)
    database.js              Mongoose connection
    email.js                 Brevo credentials
    swagger.js               OpenAPI setup
  constants/
    roles.js                 ROLES, ROLE_LABELS
    hazard.js                HAZARD_CATEGORIES, REPORT_STATUS, REPORT_PRIORITY,
                             TIMELINE_EVENT_TYPES, NOTIFICATION_TYPES
  middleware/
    auth.js                  authenticate, authenticateOptional, generateTokens
    rbac.js                  authorize, authorizeFaculty
    validate.js              express-validator result handler
    upload.js                multer document upload
    rateLimiter.js           authRateLimit, otpRateLimit
    index.js                 errorHandler, notFoundHandler
  routes/index.js            mounts all module routers under /api/v1
  services/
    audit.service.js         createAuditLog, getAuditLogsService, logAction middleware
    timeline.service.js      add*Event helpers, getTimeline
    push.service.js          sendPushNotification (Expo)
    email.service.js         sendOTPEmail, sendInviteEmail (Brevo)
  modules/<domain>/          model.js, service.js, controller.js, routes.js, validation.js
    auth/                     + model/StudentAccount.js, model/OTP.js
    student/ faculty/ department/ report/ notification/ deviceToken/
    departmentAdmin/ facultyAdmin/ environmentalAdmin/ audit/
  utils/                     apiError, apiResponse, asyncHandler, logger, otp helpers
```

### 3.2 Frontend (`envro-frontend/src`)

```
App.tsx                      Providers, fonts, 2s splash, Toast
src/
  navigation/
    RootNavigator.tsx        RootStack + AuthStack, role-based tab dispatch
    TabNavigator.tsx         StudentTabs, DepartmentAdminTabs, FacultyAdminTabs,
                             EnvironmentalAdminTabs
  contexts/
    AuthContext.tsx          user, login/logout/updateUser, session expiry
    NetworkContext.tsx       online/offline state
  screens/
    auth/                    7 files (5 registered)
    student/                 6 files
    admin/                   8 files
    launch/                  5 files
  api/
    client.ts                Axios instance + interceptors
    auth.ts reports.ts students.ts notifications.ts faculties.ts
    departments.ts admins.ts deviceTokens.ts auditLogs.ts
  services/cloudinary.ts     unsigned image upload
  hooks/
    usePushNotifications.ts        (web/no-op stub)
    usePushNotifications.native.ts (native implementation)
    useAutoRetry.ts
  constants/index.ts, theme.ts
  utils/storage.ts, navigation.ts
```

---

## 4. Data Models

Twelve standalone Mongoose schemas. All use `{ timestamps: true }`.

### 4.1 Student (`student/model.js`)
| Field | Type | Constraints |
|---|---|---|
| registrationNumber | String | required, unique, uppercase, 11 digits |
| fullName | String | required, max 150 |
| email | String | required, lowercase, indexed |
| department | String | required (denormalized name/code) |
| faculty | ObjectId → Faculty | required |
| level | String | required |
| isEligible | Boolean | default true |

Indexes: `{registrationNumber, email}`; `{faculty, department}`.

### 4.2 StudentAccount (`auth/model/StudentAccount.js`)
| Field | Type | Constraints |
|---|---|---|
| student | ObjectId → Student | required, unique |
| registrationNumber | String | required, uppercase, 11 digits |
| password | String | required, min 8, `select:false`, bcrypt(12) |
| role | String | enum `['student']`, default `student` |
| isActive | Boolean | default true |
| lastLogin | Date | |
| refreshToken | String | `select:false` |

Method `comparePassword`. Index on registrationNumber.

### 4.3 OTP (`auth/model/OTP.js`)
| Field | Type | Constraints |
|---|---|---|
| email | String | required, lowercase, indexed |
| otpHash | String | required (hashed) |
| purpose | String | enum `registration`, `password_reset`, `admin_registration` |
| expiresAt | Date | required, TTL index `expireAfterSeconds:0` |
| isUsed | Boolean | default false |
| attempts / maxAttempts | Number | default 0 / 3 |

### 4.4 Faculty (`faculty/model.js`)
| Field | Type | Constraints |
|---|---|---|
| name | String | required, unique, max 200 |
| code | String | unique sparse, max 50 |
| description | String | max 500 |
| isActive | Boolean | default true |

Text index `{name, code}`.

### 4.5 Department (`department/model.js`)
| Field | Type | Constraints |
|---|---|---|
| name | String | required, max 200 |
| code | String | required, uppercase, max 20 |
| faculty | ObjectId → Faculty | required |
| description | String | max 500 |
| isActive | Boolean | default true |
| createdBy | ObjectId | |

Unique compound index `{code, faculty}`; index `{faculty, isActive}`.

### 4.6 DepartmentAdmin (`departmentAdmin/model.js`)
`fullName`, `email` (unique), `password` (`select:false`, bcrypt 12), `role` = `departmentAdmin`, `faculty` → Faculty (required), `department` → Department (required), `isActive`, `isOnboarded`, `lastLogin`, `refreshToken`, `createdBy` → FacultyAdmin.
Indexes `{faculty, department}`, `{department, isActive}`.

### 4.7 FacultyAdmin (`facultyAdmin/model.js`)
Same shape as DepartmentAdmin minus `department`; `faculty` → Faculty required; `createdBy` → EnvironmentalAdmin. Index `{faculty, isActive}`.

### 4.8 EnvironmentalAdmin (`environmentalAdmin/model.js`)
`fullName`, `email` unique, `password` (`select:false`), `role` = `environmentalAdmin`, `isActive`, `isOnboarded`, `lastLogin`, `refreshToken`, `createdBy` → EnvironmentalAdmin. This is the super-admin / root tier (no faculty scope). Index `{isActive}`.

### 4.9 HazardReport (`report/model.js`)
| Field | Type | Constraints |
|---|---|---|
| title | String | required, max 200 |
| description | String | required, max 2000 |
| category | String | required, enum HAZARD_CATEGORIES |
| images[] | `{url, publicId}` | Cloudinary refs |
| location | `{type:'Point', coordinates:[lng,lat], address}` | address required; 2dsphere index |
| reportedBy | ObjectId → StudentAccount | required, indexed |
| studentInfo | `{registrationNumber, fullName, faculty→Faculty, department}` | snapshot |
| faculty | ObjectId → Faculty | required, indexed |
| status | String | enum REPORT_STATUS, default `pending`, indexed |
| priority | String | enum REPORT_PRIORITY, default `medium` |
| assignedTo | ObjectId → EnvironmentalAdmin | |
| statusHistory[] | `{status, changedBy, changedByModel enum ['EnvironmentalAdmin'], note, changedAt}` | |
| resolvedAt | Date | set by pre-save hook |
| timeline[] | `{eventType, description, actor, actorModel, actorName, metadata, createdAt}` | |

Indexes: `createdAt:-1`, `{faculty,status}`, `category`, `studentInfo.registrationNumber`, 2dsphere on coordinates.
Pre-save: when status is modified to `resolved`, `resolvedAt = now`.

### 4.10 Notification (`notification/model.js`)
`recipient` (refPath `recipientModel`), `recipientModel` enum `['StudentAccount','DepartmentAdmin','FacultyAdmin','EnvironmentalAdmin']`, `type` enum NOTIFICATION_TYPES, `title`, `message`, `relatedEntityType` enum `['Report','Faculty','Department','Admin','Announcement',null]`, `relatedEntityId`, `isRead` (indexed), `readAt`, `metadata` Mixed.
Indexes `{recipient,createdAt:-1}`, `{isRead,createdAt:-1}`, `{type,createdAt:-1}`.

### 4.11 DeviceToken (`deviceToken/model.js`)
`user` (refPath `userModel`), `userModel` enum, `token` String unique, `platform` enum `['ios','android','web']` default `android`, `isActive` default true. Index `{user,isActive}`.

### 4.12 AuditLog (`audit/model.js`)
`actor` (refPath `actorModel`), `actorModel` enum `['StudentAccount','DepartmentAdmin','FacultyAdmin','EnvironmentalAdmin','System']` default `System`, `actorName`, `action` (indexed), `entityType`, `entityId`, `description`, `faculty` → Faculty, `department` String, `ipAddress`, `userAgent`.
Indexes on `createdAt`, `{faculty,createdAt}`, `{action,createdAt}`, `{entityType,createdAt}`.

### 4.13 Enumerations (`constants/hazard.js`, `constants/roles.js`)
- **HAZARD_CATEGORIES:** Flooding, Waste Dumping, Pollution, Blocked Drainage, Dirty Environment, Others.
- **REPORT_STATUS:** pending, under_review, in_progress, resolved.
- **REPORT_PRIORITY:** low, medium, high, critical.
- **TIMELINE_EVENT_TYPES:** report_submitted, status_changed, report_assigned, comment_added, image_added, report_edited.
- **NOTIFICATION_TYPES:** report_submitted, report_status_changed, report_rejected, report_assigned, announcement, student_upload, admin_created, admin_updated, admin_disabled, system.
- **ROLES:** student, departmentAdmin, facultyAdmin, environmentalAdmin.

---

## 5. Entity Relationships

```
Faculty 1 ──< Department        (Department.faculty)
Faculty 1 ──< Student           (Student.faculty)
Faculty 1 ──< FacultyAdmin      (FacultyAdmin.faculty)
Faculty 1 ──< DepartmentAdmin   (DepartmentAdmin.faculty)
Faculty 1 ──< HazardReport      (HazardReport.faculty)
Department 1 ──< DepartmentAdmin (DepartmentAdmin.department)

Student 1 ──1 StudentAccount    (StudentAccount.student)
StudentAccount 1 ──< HazardReport (reportedBy)
StudentAccount 1 ──< Notification (recipient, polymorphic)
StudentAccount 1 ──< DeviceToken  (user, polymorphic)
StudentAccount 1 ──< AuditLog     (actor, polymorphic)

EnvironmentalAdmin 1 ──< HazardReport (assignedTo)
EnvironmentalAdmin 1 ──< FacultyAdmin (createdBy)
EnvironmentalAdmin 1 ──< EnvironmentalAdmin (createdBy, self-ref)

FacultyAdmin 1 ──< DepartmentAdmin (createdBy)

Student / DepartmentAdmin / FacultyAdmin / EnvironmentalAdmin
        ──< Notification (polymorphic recipient)
        ──< DeviceToken  (polymorphic user)
        ──< AuditLog     (polymorphic actor, nullable)

HazardReport 1 ──< timeline[]      (embedded)
HazardReport 1 ──< statusHistory[] (embedded)
OTP (standalone, keyed by email)
```

**Cardinality notes**
- One Student has exactly one StudentAccount.
- A HazardReport references the reporter account (`reportedBy`) and snapshots identity in `studentInfo`.
- `faculty` is denormalized onto the report for fast scoping and survives even if the student record changes.
- `timeline` and `statusHistory` are embedded documents, not separate collections.

---

## 6. Administrative Hierarchy

```
EnvironmentalAdmin (super admin, no faculty scope)
  ├── manages FacultyAdmin accounts (create/update/toggle/delete)
  ├── manages EnvironmentalAdmin accounts (peer/super)
  ├── manages Faculties (create/update/toggle/delete)
  ├── sees all reports, all students, system dashboard
  └── updates/assigns/deletes reports

FacultyAdmin (scoped to one Faculty)
  ├── manages DepartmentAdmin accounts within own faculty
  ├── manages Departments within own faculty
  ├── imports students (faculty scope)
  ├── views reports/students of own faculty; views audit logs (own faculty)
  └── cannot change report status/assign/delete

DepartmentAdmin (scoped to one Department within a Faculty)
  ├── manages student roster of own department (batch, update, delete)
  ├── imports students (department scope)
  └── read-only reports/students within faculty/department

Student
  ├── registers with student number + school-email OTP
  ├── submits reports, edits own pending reports
  └── views own reports, notifications
```

Scope resolution:
- `authenticate` loads the user model matching `decoded.role`, then attaches `req.user = {id, role, email, faculty}`; for department admins it resolves `department`, `departmentName`, `departmentCode` from the Department collection.
- `authorize(...roles)` enforces the role list.
- `authorizeFaculty` blocks faculty/department admins from targeting a different faculty, except environmental admins who bypass it.

---

## 7. Authentication & Authorization

### 7.1 Tokens
`generateTokens(userId, role)` signs:
- Access JWT — secret `JWT_SECRET`, default expiry `7d`.
- Refresh JWT — secret `JWT_REFRESH_SECRET`, default expiry `30d`.

Refresh tokens are persisted on the user document (`refreshToken`, `select:false`) and rotated on every refresh. Toggling an account inactive nulls `refreshToken`.

### 7.2 Registration flows
**Student**
1. `POST /auth/student/request-otp` — looks up `Student` by 11-digit number, checks `isEligible`, rejects duplicate active account, invalidates prior OTPs, stores hashed OTP (10 min, max 3 attempts), emails OTP via Brevo.
2. `POST /auth/student/verify-otp` — validates OTP, increments attempts, returns a 15-minute `verificationToken` JWT plus a student preview.
3. `POST /auth/student/complete-registration` — verifies token, re-checks no account exists, consumes OTP, creates `StudentAccount`, issues tokens, stores refresh token.

**Admin** (environmental/faculty/department)
1. `POST /auth/admin/registration-otp` — searches all three admin models by email; requires existing record, active, not yet onboarded.
2. `POST /auth/admin/complete-registration` — validates OTP, sets password + `isOnboarded=true`, issues tokens, updates `lastLogin`.

Admin accounts are created by a superior admin (Section 6); the created account receives an invite email (`sendInviteEmail`) and a `admin_created` notification.

### 7.3 Login
- `POST /auth/student/login` — by registration number + password.
- `POST /auth/admin/login` — by email + password + `role` (selects the model).
Both reject non-onboarded/inactive accounts and return the account profile plus tokens.

### 7.4 Password reset
Student: `POST /auth/forgot-password` (by registration number) + `POST /auth/reset-password` (registration number + OTP + new password).
Admin: `POST /auth/admin/forgot-password` + `POST /auth/admin/reset-password` (email + OTP + new password).

### 7.5 Session
- `authenticate` extracts `Bearer` token, verifies access secret, loads the role-specific model, rejects missing/inactive users.
- `authenticateOptional` never fails; sets `req.user=null` on any error.
- `POST /auth/refresh-token` validates the refresh token against the stored value and active flag, rotates tokens.
- `GET /auth/me`, `POST /auth/change-password`, `POST /auth/logout` are authenticated.
- Rate limiting: `authRateLimit` on logins, `otpRateLimit` on OTP/password-reset endpoints.

---

## 8. Hazard Report Lifecycle

**Statuses:** pending → under_review → in_progress → resolved (terminal). The model also allows arbitrary transitions via the API but the UI/logic assumes the forward path.

**Creation** (`createReportService`)
1. Load `StudentAccount`, then the `Student` by registration number with populated faculty.
2. Create `HazardReport` with normalized coordinates `[lng, lat]`, address, category, priority (default medium), `reportedBy`, and a `studentInfo` snapshot.
3. Notify every FacultyAdmin of the report's faculty and every EnvironmentalAdmin (`report_submitted`).
4. Append timeline event `report_submitted`.
5. Write audit log `create_report`.

**Editing** (`updateReportService`, `PUT /reports/:id`, student only)
- Guards: reporter must equal the current account; status must be `pending`.
- Optional fields: title, description, category, priority, address, coordinates (both lat+lng valid), images.
- Collects `changedFields`, saves, appends `report_edited` timeline event with metadata, writes audit `update_report`.

**Status update** (`updateReportStatusService`, `PATCH /reports/:id/status`, environmental admin only)
- Sets status, pushes `statusHistory` entry (changedByModel `EnvironmentalAdmin`), pre-save sets `resolvedAt`.
- Notifies reporter (`report_status_changed`) with previous/new status and note.
- Appends `status_changed` timeline event and writes audit `update_report_status`.

**Assignment** (`assignReportService`, `PATCH /reports/:id/assign`, environmental admin only)
- Sets `assignedTo`, appends `report_assigned` timeline event, sends an assignment notification.
- ⚠ Recipient model is hardcoded `'FacultyAdmin'` while the report's `assignedTo` references `EnvironmentalAdmin` (Section 21, issue C2).

**Deletion** (`deleteReportService`, environmental admin only) — deletes the document and writes audit `delete_report`.

**Reads**
- `GET /reports/my-reports` (student, own only).
- `GET /reports` and `/reports/stats` (environmental, faculty, department admins) — faculty-scoped for faculty/department admins.
- `GET /reports/:id` — all four roles; faculty scope applied for department admins only.
- `GET /reports/:id/timeline` — all four roles.

---

## 9. Notifications

`createNotificationService`:
- Skips self-notification (`actorId === recipientId`) and incomplete payloads.
- Creates a `Notification` document and calls `sendPushNotification` (Expo).

`sendPushNotification` (`push.service.js`): lazily imports `expo-server-sdk`; loads active `DeviceToken`s for `(user, userModel)`; filters with `Expo.isExpoPushToken`; chunks and sends with `channelId:'notification'`, `priority:'high'`, `sound:'default'`; logs receipts; failures are swallowed/logged.

Bulk variant `createBulkNotificationsService` uses `insertMany` then pushes each.

**Triggers**
| Event | Recipients |
|---|---|
| Report submitted | FacultyAdmins of the faculty + all EnvironmentalAdmins |
| Report status changed | Reporter (StudentAccount) |
| Report assigned | Assignee |
| Admin created / updated / disabled | That admin |
| (Student upload / announcement types defined but not emitted in code read) | — |

Read APIs: list (paginated + unreadCount), stats (total/unread/read/byType), mark one read, mark all read, delete.

---

## 10. Audit Logging

Two mechanisms:
1. **Explicit** `createAuditLog(...)` in services (report create/edit/status/delete, faculty/department CRUD, admin admin-... services).
2. **Middleware** `logAction(resource, action)` wraps `res.json` and writes a generic log on response, using `req.user` and `req.params.id || body.data._id`.

`createAuditLog` (post-fix) nulls `actor` when `actorModel` is not one of the four real actor models, preventing `refPath:'System'` population crashes. All failures are caught and logged, never propagated.

`getAuditLogsService`: paginated; **faculty admins scoped to their own faculty**; filters by entityType, action, actor, description (regex), date range. `AuditLog` list route is restricted to `environmentalAdmin` and `facultyAdmin`.

---

## 11. Device Tokens

- `POST /device-tokens` registers an Expo push token for the authenticated user (`user`, `userModel`, `platform`). `token` is unique (upsert semantics expected).
- `DELETE /device-tokens` deactivates/removes the token (unregister).
- Push delivery consumes only `isActive:true` tokens.
- Platform resolution on the client: `ios` / `android` / `web`.

---

## 12. API Endpoint Inventory

Base path `/api/v1`. Auth: `authenticate` unless marked public.

### Auth (`/auth`)
| Method | Path | Access |
|---|---|---|
| POST | /student/request-otp | public, otpRateLimit |
| POST | /student/verify-otp | public |
| POST | /student/complete-registration | public |
| POST | /student/login | public, authRateLimit |
| POST | /admin/login | public, authRateLimit |
| POST | /admin/registration-otp | public, otpRateLimit |
| POST | /admin/complete-registration | public |
| POST | /forgot-password | public, otpRateLimit |
| POST | /reset-password | public |
| POST | /admin/forgot-password | public, otpRateLimit |
| POST | /admin/reset-password | public |
| POST | /refresh-token | public |
| GET | /me | any auth |
| POST | /change-password | any auth |
| POST | /logout | any auth |

### Reports (`/reports`)
| Method | Path | Access |
|---|---|---|
| POST | / | student |
| PUT | /:id | student |
| GET | /my-reports | student |
| GET | /stats | env/faculty/dept admin |
| GET | / | env/faculty/dept admin |
| GET | /:id | all roles |
| PATCH | /:id/status | environmental admin |
| PATCH | /:id/assign | environmental admin |
| GET | /:id/timeline | all roles |
| DELETE | /:id | environmental admin |

### Students (`/students`)
| Method | Path | Access |
|---|---|---|
| POST | /import | dept/faculty admin |
| POST | /batch | department admin |
| GET | /search | dept/faculty/env admin |
| GET | /stats | dept/faculty/env admin |
| GET | / | dept/faculty/env admin |
| GET | /:id | dept/faculty/env admin |
| PATCH | /:id | department admin |
| DELETE | /:id | department admin |

### Faculties (`/faculties`)
| Method | Path | Access |
|---|---|---|
| GET | / | public |
| GET | /:id | public |
| POST | / | environmental admin |
| PATCH | /:id | environmental admin |
| PATCH | /:id/toggle-status | environmental admin |
| DELETE | /:id | environmental admin |

### Departments (`/departments`)
| Method | Path | Access |
|---|---|---|
| GET | / | any auth |
| GET | /:id | any auth |
| POST | / | faculty/env admin + authorizeFaculty |
| PATCH | /:id | faculty/env admin + authorizeFaculty |
| PATCH | /:id/toggle-status | faculty/env admin + authorizeFaculty |
| DELETE | /:id | faculty/env admin + authorizeFaculty |

### Department Admins (`/department-admin`)
| Method | Path | Access |
|---|---|---|
| GET | / | dept/faculty/env admin |
| POST | / | faculty/env admin |
| GET | /:id | faculty/env admin |
| PATCH | /:id | faculty/env admin |
| PATCH | /:id/toggle-status | faculty/env admin |
| DELETE | /:id | faculty/env admin |

### Faculty Admins (`/faculty-admin`)
| Method | Path | Access |
|---|---|---|
| GET | / | faculty/env admin |
| POST | / | environmental admin |
| GET | /:id | environmental admin |
| PATCH | /:id | environmental admin |
| PATCH | /:id/toggle-status | environmental admin |
| DELETE | /:id | environmental admin |

### Environmental Admins (`/environmental-admin`)
| Method | Path | Access |
|---|---|---|
| GET | /dashboard | environmental admin |
| GET | / | environmental admin |
| POST | / | environmental admin |
| PATCH | /:id | environmental admin |
| PATCH | /:id/toggle-status | environmental admin |
| DELETE | /:id | environmental admin |

### Notifications (`/notifications`)
| Method | Path | Access |
|---|---|---|
| GET | / | any auth (own) |
| GET | /stats | any auth (own) |
| PATCH | /:id/read | any auth (own) |
| PATCH | /mark-all-read | any auth (own) |
| DELETE | /:id | any auth (own) |

### Device Tokens (`/device-tokens`)
| Method | Path | Access |
|---|---|---|
| POST | / | any auth |
| DELETE | / | any auth |

### Audit Logs (`/audit-logs`)
| Method | Path | Access |
|---|---|---|
| GET | / | environmental/faculty admin |

### System
| Method | Path | Access |
|---|---|---|
| GET | /health | public |
| GET | /api-docs | public (Swagger) |

---

## 13. RBAC Matrix

Legend: ✔ allowed, scope limits apply where noted; ✘ denied.

| Resource / Action | Student | Dept Admin | Faculty Admin | Env Admin |
|---|---|---|---|---|
| Submit report | ✔ | ✘ | ✘ | ✘ |
| Edit own pending report | ✔ | ✘ | ✘ | ✘ |
| View own reports | ✔ | – | – | – |
| View reports (list) | ✘ | ✔ faculty | ✔ faculty | ✔ all |
| View report by id | ✔ (own UI) | ✔ faculty | ✔ | ✔ |
| Change report status | ✘ | ✘ | ✘ | ✔ |
| Assign report | ✘ | ✘ | ✘ | ✔ |
| Delete report | ✘ | ✘ | ✘ | ✔ |
| Import students | ✘ | ✔ dept | ✔ faculty | ✘ |
| Batch create students | ✘ | ✔ | ✘ | ✘ |
| Update/delete student | ✘ | ✔ dept | ✘ | ✘ |
| View students | ✘ | ✔ | ✔ | ✔ |
| Manage faculties | ✘ | ✘ | ✘ | ✔ |
| Manage departments | ✘ | ✘ | ✔ own faculty | ✔ |
| Manage department admins | ✘ | view | ✔ own faculty | ✔ |
| Manage faculty admins | ✘ | ✘ | view own faculty | ✔ |
| Manage environmental admins | ✘ | ✘ | ✘ | ✔ |
| View audit logs | ✘ | ✘ | ✔ own faculty | ✔ all |
| System dashboard | ✘ | ✘ | ✘ | ✔ |
| Notifications | own | own | own | own |
| Device tokens | own | own | own | own |

---

## 14. Frontend Architecture

### 14.1 Provider hierarchy (`App.tsx`)
```
GestureHandlerRootView
 └ ErrorBoundary
    └ SafeAreaProvider
       └ AuthProvider
          └ NetworkProvider
             └ AppContent  → RootNavigator, NetworkBanner, Toast
```
`App.tsx` loads Plus Jakarta Sans fonts and enforces a minimum 2-second branded splash. `AppContent` calls `usePushNotifications()` and renders the root navigator plus an offline `NetworkBanner` and a styled `Toast` (success/error/warning/info).

### 14.2 Navigation
`RootNavigator` re-keys on `isAuthenticated`. Unauthenticated flow: `Onboarding` / `WelcomeRole` → `AuthFlow` (AuthStack: StudentLogin, StudentRegister, AdminLogin, AdminRegister, ForgotPassword). Authenticated: `Main` → `getTabForRole(user.role)`.

| Role | Tabs |
|---|---|
| student | Home (HomeStack), Report (direct), My Reports (ReportsStack), Notifications, Profile |
| departmentAdmin | Dashboard, Reports, Students, Settings |
| facultyAdmin | Dashboard, Reports, Students, Faculties, Dept Admins, Settings |
| environmentalAdmin | Dashboard, Reports, Faculties, Admins, Settings |

Shared nested stacks include `AdminDashboardStack` (DashboardMain → AdminDashboard, ReportDetail, NotificationsList, AuditLogs), `AdminReportsStack`, `StudentsStack`, `FacultiesStack`, `AdminsStack`, `AdminSettingsStack` (SettingsMain → AdminSettings, AuditLogs). Student `ReportsStack` contains MyReports, ReportDetail, ReportHazard (edit).

Unregistered screens on disk: `auth/LandingScreen.tsx`, `auth/RoleSelectScreen.tsx` (superseded by launch screens).

### 14.3 AuthContext
State: `user`, `isLoading`; derived `isAuthenticated`. AsyncStorage keys: `accessToken`, `refreshToken`, `user`, `lastRole`. Exposes `login(user, access, refresh)`, `logout()`, `updateUser(user)`. Registers `onSessionExpired` to clear tokens and force re-auth. Calls `wakeUpServer()` on mount (Render cold start).

### 14.4 API client
Axios, base URL from `EXPO_PUBLIC_API_URL` (fallback `https://envroguard-tmjk.onrender.com/api/v1` on native, `http://localhost:5000/api/v1` on web), 60s timeout. Request interceptor injects `Bearer` token. Response interceptor:
1. Network-error retry once after 2s (cold-start wake).
2. Normalizes `userMessage`.
3. On 401: queued refresh via `POST /auth/refresh-token`; on success replays requests; on failure triggers session-expired logout.

### 14.5 Screens (26 files)
- auth (7): AdminLogin, AdminRegister, ForgotPassword, Landing*, RoleSelect*, StudentLogin, StudentRegister.
- student (6): Home, MyReports, Notifications, Profile, ReportDetail, ReportHazard.
- admin (8): AdminReportDetail, Admins, AuditLogs, Dashboard, Faculties, Reports, Settings, Students.
- launch (5): Onboarding, Session, Splash, WelcomeRole, Welcome.
(* not registered.)

### 14.6 Client external services
- `services/cloudinary.ts`: reads image, converts to base64 data URI (Expo FileSystem native / FileReader web), POSTs `application/x-www-form-urlencoded` to the unsigned Cloudinary upload endpoint; deterministic `reports/hazard_<ts>_<rand>` public ids; `uploadMultipleToCloudinary` rolls back on partial failure.
- `usePushNotifications.native.ts`: permission request, Android channels (`notification` HIGH, `toast` LOW), Expo token retrieval, backend registration, tap-routing via `navigateFromNotification`, listener cleanup.
- `usePushNotifications.ts`: web no-op stub (Metro resolves the `.native` variant on device).

---

## 15. External Services

| Service | Purpose | Integration |
|---|---|---|
| MongoDB Atlas | Primary datastore | Mongoose, `MONGODB_URI` |
| Render | API hosting | `envroguard-tmjk.onrender.com`; cold starts handled client-side |
| Cloudinary | Image storage/CDN | Unsigned upload preset; backend stores `url` + `publicId` |
| Brevo | Transactional email (OTP, admin invite) | HTTPS `api.brevo.com/v3/smtp/email`, `BREVO_API_KEY` |
| Expo Push | Mobile push delivery | `expo-server-sdk`, device tokens |
| Swagger | API documentation | `/api-docs` |

---

## 16. Key Sequences

### 16.1 Student registration
```
Client → API: POST /auth/student/request-otp {registrationNumber}
API → Student: findBy registrationNumber (+faculty); checks isEligible
API → OTP: invalidate old, create hashed OTP (10m, 3 attempts)
API → Brevo: send OTP email
API → Client: 200 masked email + expiresAt

Client → API: POST /auth/student/verify-otp {registrationNumber, otp}
API → OTP: find active, check expiry/attempts, compare hash
API → Client: 200 { verificationToken(15m), student preview }

Client → API: POST /auth/student/complete-registration {verificationToken, password}
API → JWT: verify token
API → StudentAccount: create (bcrypt 12)
API: generateTokens; persist refreshToken
API → Client: 201 { account, accessToken, refreshToken }
```

### 16.2 Student login
```
Client → API: POST /auth/student/login {registrationNumber, password}
API → StudentAccount: findOne(+password).populate(student)
API: comparePassword; check isActive
API: generateTokens; update refreshToken, lastLogin
API → Client: 200 { account, accessToken, refreshToken }
```

### 16.3 Report submission
```
Client: geolocate, upload images to Cloudinary → [{url, publicId}]
Client → API: POST /reports (Bearer student) {title, description, category,
             images, address, latitude, longitude, priority}
API: authenticate → authorize(student) → validate
API → StudentAccount/Student: resolve reporter + faculty
API → HazardReport: create (status pending, studentInfo snapshot, coords [lng,lat])
API → Notification: for each FacultyAdmin(faculty) + all EnvironmentalAdmins
API → Expo: push each recipient
API → HazardReport: $push timeline report_submitted
API → AuditLog: create_report
API → Client: 201 report
```

### 16.4 Report status update
```
Client → API: PATCH /reports/:id/status (Bearer env admin) {status, note}
API → HazardReport: set status; push statusHistory; save (pre-save sets resolvedAt)
API → Notification: reporter report_status_changed (prev/new, note)
API → HazardReport: $push timeline status_changed
API → AuditLog: update_report_status
API → Client: 200 report
```

### 16.5 Token refresh (client interceptor)
```
Any request → 401
Client: if not retried, queue request; POST /auth/refresh-token {refreshToken}
API → JWT: verify refresh secret
API → user model: match _id + stored refreshToken + isActive
API: rotate access+refresh; persist
API → Client: { accessToken, refreshToken }
Client: replay queued requests with new token
(on failure: session-expired → logout)
```

### 16.6 Admin provisioning
```
Env/Faculty Admin → API: POST /department-admin|/faculty-admin|/environmental-admin
API: validate faculty/department ownership, uniqueness
API → Admin model: create (isOnboarded false)
API → Brevo: invite email
API → Notification: admin_created
API → AuditLog (via logAction)
Invitee → API: POST /auth/admin/registration-otp → OTP
Invitee → API: POST /auth/admin/complete-registration → set password, isOnboarded, tokens
```

---

## 17. Data Flow Diagrams (DFD)

### 17.1 Context (Level 0)
```
                    ┌───────────────────────────┐
   Student ───────► │                           │ ───────► Faculty Admin
   Admin   ───────► │       EnviroGuard         │ ───────► Environmental Admin
                    │   Hazard Reporting System │
   Expo Push ◄───── │                           │ ───────► Audit Log store
   Brevo     ◄───── │                           │
   Cloudinary◄───── │                           │
                    └───────────────────────────┘
```

### 17.2 Level 1
```
Student ──(report data, images)──► [Report Management] ──► HazardReport (D1)
                                        │
                                        ├──► [Notification] ──► Notification (D2) ──► Expo Push
                                        ├──► [Timeline] ──► embedded timeline
                                        └──► [Audit] ──► AuditLog (D3)

Admin ──(status/assign, admin CRUD)──► [Administration] ──► all collections
                                          └──► [Audit] ──► AuditLog (D3)

Student ──(registration, OTP)──► [Auth] ──► OTP (D4), StudentAccount (D5) ──► Brevo
```

### 17.3 Level 2 — Report status change
```
Env Admin ──status+note──► validate ──► update HazardReport(D1)
                                        ├── append statusHistory
                                        ├── append timeline
                                        ├── create Notification(D2) ──► Push
                                        └── create AuditLog(D3)
                     HazardReport(D1) ──► response to Env Admin
```

---

## 18. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (Expo)                             │
│  Screens ── Navigation (Root + role Tabs) ── AuthContext          │
│  API layer (Axios + refresh queue)  Cloudinary upload  Expo Push  │
└───────────────┬──────────────────────────────┬───────────────────┘
                │ HTTPS /api/v1                 │ unsigned upload
                ▼                                ▼
┌──────────────────────────────┐        ┌──────────────────┐
│        EXPRESS API           │        │   CLOUDINARY      │
│ helmet/cors/rate-limit/json  │◄──────►│  image storage    │
│ authenticate → authorize     │        └──────────────────┘
│ validate → logAction         │
│ Routers → Controllers        │        ┌──────────────────┐
│        → Services            │◄──────►│      BREVO        │
└──────┬───────────────┬───────┘  email └──────────────────┘
       │ Mongoose      │ Expo SDK
       ▼               ▼
┌─────────────┐  ┌───────────────┐
│  MongoDB    │  │  Expo Push    │
│  Atlas      │  │  Service      │
└─────────────┘  └───────────────┘
```
Layers: Presentation (client) → API/Routing → Middleware (auth/rbac/validate/audit) → Business logic (services) → Data access (Mongoose models) → Persistence (MongoDB) with cross-cutting Notification, Timeline, Audit, Email, Push.

---

## 19. Use Cases

**Actors:** Student, Department Admin, Faculty Admin, Environmental Admin, (external: Brevo, Expo Push, Cloudinary).

| UC | Name | Primary actor |
|---|---|---|
| UC1 | Register with student number + OTP | Student |
| UC2 | Login / refresh / logout | All |
| UC3 | Reset password | All |
| UC4 | Submit hazard report | Student |
| UC5 | Edit own pending report | Student |
| UC6 | View own reports / timeline | Student |
| UC7 | View scoped reports | Dept/Faculty/Env Admin |
| UC8 | Update report status | Environmental Admin |
| UC9 | Assign report | Environmental Admin |
| UC10 | Delete report | Environmental Admin |
| UC11 | Import / batch-create students | Dept/Faculty admin |
| UC12 | Manage student roster | Department Admin |
| UC13 | Manage faculties | Environmental Admin |
| UC14 | Manage departments | Faculty/Env Admin |
| UC15 | Provision admins (invite, disable) | Faculty/Env Admin |
| UC16 | View audit logs | Faculty/Env Admin |
| UC17 | View dashboards/statistics | All admins |
| UC18 | Receive notifications / push | All |
| UC19 | Upload report images | Student |
| UC20 | Register device for push | All |

Representative include/extends: UC4 «include» UC19, UC18; UC8/UC9 «include» UC18; UC15 «include» UC13/UC14 (context), all admin UCs «include» audit + auth.

---

## 20. Class Diagram & ERD

### 20.1 Class diagram (logical)
```
Student ──1──1── StudentAccount ──1──*── HazardReport
StudentAccount ──1──*── Notification (recipient, polymorphic)
StudentAccount ──1──*── DeviceToken  (user, polymorphic)
StudentAccount ──1──*── AuditLog     (actor, polymorphic)

Faculty ──1──*── Student
Faculty ──1──*── Department
Faculty ──1──*── FacultyAdmin
Faculty ──1──*── DepartmentAdmin
Faculty ──1──*── HazardReport

Department ──1──*── DepartmentAdmin
EnvironmentalAdmin ──1──*── HazardReport (assignedTo)
EnvironmentalAdmin ──1──*── FacultyAdmin (createdBy)
FacultyAdmin ──1──*── DepartmentAdmin (createdBy)

OTP (email-keyed, standalone)

HazardReport *──* Embedded: TimelineEvent, StatusHistoryEntry, HazardImage
```

Key operations (method-level):
- `StudentAccount.comparePassword(pw)`
- `DepartmentAdmin/FacultyAdmin/EnvironmentalAdmin.comparePassword(pw)`
- Pre-save hooks: password hashing (bcrypt 12); HazardReport `resolvedAt` on resolve.

### 20.2 ERD (table view)

| Entity | Key attributes | FKs |
|---|---|---|
| Student | _id, registrationNumber(U), fullName, email, department, level, isEligible | faculty→Faculty |
| StudentAccount | _id, registrationNumber, password, role, isActive | student→Student(U) |
| OTP | _id, email, otpHash, purpose, expiresAt(TTL), attempts | — |
| Faculty | _id, name(U), code(U), description, isActive | — |
| Department | _id, code, name, isActive | faculty→Faculty; createdBy |
| DepartmentAdmin | _id, fullName, email(U), password, isOnboarded, isActive | faculty→Faculty; department→Department; createdBy→FacultyAdmin |
| FacultyAdmin | _id, fullName, email(U), password, isOnboarded, isActive | faculty→Faculty; createdBy→EnvironmentalAdmin |
| EnvironmentalAdmin | _id, fullName, email(U), password, isOnboarded, isActive | createdBy→EnvironmentalAdmin |
| HazardReport | _id, title, description, category, status, priority, resolvedAt, location | reportedBy→StudentAccount; faculty→Faculty; assignedTo→EnvironmentalAdmin; studentInfo.faculty→Faculty |
| Notification | _id, recipient, recipientModel, type, title, message, isRead | recipient polymorphic |
| DeviceToken | _id, token(U), userModel, platform, isActive | user polymorphic |
| AuditLog | _id, action, entityType, entityId, description, actorModel | actor polymorphic; faculty→Faculty |

---

## 21. Consistency Check & Final Summary

### 21.1 Documented discrepancies / code-level issues

| ID | Location | Finding | Impact |
|---|---|---|---|
| C1 | `report/service.js:207-224` `getReportByIdService` | Faculty scoping applied only to `departmentAdmin`, not `facultyAdmin` (whereas list/stats scope both). | A faculty admin could fetch a report from another faculty by id. |
| C2 | `report/service.js:287-314` `assignReportService` | Sets `assignedTo` (ref `EnvironmentalAdmin`) but sends the assignment notification with `recipientModel:'FacultyAdmin'`. | Assignee may never receive the notification; notification recipient mismatch. |
| C3 | `department/routes.js` + `rbac.js` `authorizeFaculty` | `authorizeFaculty` reads `params.facultyId`, `body.faculty`, `query.faculty`; department routes scope by `:id`. On `PATCH/DELETE /departments/:id`, if `body.faculty` is absent the cross-faculty check is skipped. | Potential cross-faculty department modification by a faculty admin. |
| C4 | `faculty/service.js:70-85` `deleteFacultyService`, `department/service.js:125-141` `deleteDepartmentService` | `createAuditLog` called without `actor`/`actorModel`; defaults to `System`, actor null. | Deletions logged anonymously (cannot attribute to admin). |
| C5 | `report/service.js:50` | `faculty` is assigned `student.faculty?._id || data.faculty || null` while the schema marks `faculty` required. | If a student record lacks faculty and no body faculty is supplied, creation throws a Mongoose validation error. |
| C6 | `hazard.js` vs lifecycle | `REPORT_STATUS` has no validation forbidding backward transitions; `updateReportStatusService` allows any status. | Resolved report could be reverted; `resolvedAt` is not cleared. |
| C7 | `push.service.js` / `deviceToken` | No receipt-based deactivation of invalid tokens (`DeviceToken` receipts aren't consumed). | Stale tokens accumulate; only client unregister deactivates. |
| C8 | `notification/service.js:44-50` | Fire-and-forget `sendPushNotification` (not awaited) inside an `async` function. | Push errors are isolated (intended) but the function resolves before push completes. |
| C9 | `environmentalAdmin/service.js:11` | Imports `createAuditLog` but never uses it (auditing relies on `logAction`). | Dead import only; no functional impact. |
| C10 | Frontend `screens/auth/LandingScreen.tsx`, `RoleSelectScreen.tsx` | Exist on disk but are not registered in any navigator. | Dead code; superseded by launch screens. |

### 21.2 Confirmed implemented facts (safe for diagrams)
- 12 standalone Mongoose models with the exact fields, enums, defaults, indexes, and relationships in Section 4–5.
- 4 roles and the exact endpoint/role matrix in Section 12–13.
- JWT access (7d) / refresh (30d) with rotation and persisted refresh tokens.
- OTP hashed, 6-digit, 10-minute expiry, max 3 attempts, TTL-indexed.
- Report lifecycle with embedded `statusHistory` and `timeline`, Cloudinary images, 2dsphere coordinates.
- Notification fan-out on submission/status/assignment/admin events; Expo push; device-token registration.
- Audit logging via explicit service calls + `logAction` response middleware; faculty-scoped reads.
- Frontend: Expo SDK 56, role-based tab navigators, AuthContext with AsyncStorage persistence, Axios refresh-queue interceptor, Cloudinary unsigned upload, native push hook.
- External services: MongoDB Atlas, Render, Cloudinary, Brevo, Expo Push, Swagger.

### 21.3 Notes for diagram authors
- **Class diagram:** model 13 classes; use polymorphic associations (recipient/actor/user with `*Model`) as dashed qualified associations; embed TimelineEvent/StatusHistory/HazardImage as compositions of HazardReport.
- **ERD:** `faculty` appears as an FK in six tables; `assignedTo` and `createdBy` are self/peer refs.
- **Use case:** four human actors; external systems (Brevo, Expo, Cloudinary) as supporting actors.
- **Sequence:** use Sections 16.1–16.6 verbatim; they map exactly to controller/service call order.
- **DFD:** use Section 17 levels; data stores D1 HazardReport, D2 Notification, D3 AuditLog, D4 OTP, D5 StudentAccount/Student.
- **Activity:** report lifecycle (Section 8) and admin provisioning (16.6) are the two richest flows.
