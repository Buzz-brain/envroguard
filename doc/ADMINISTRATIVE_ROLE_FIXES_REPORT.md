# Administrative Responsibility Model — Implementation & Verification Report

**Date:** 18 September 2026
**Scope:** `envro-backend` + `envro-frontend` implementation fixes for the 7 clarified administrative-responsibility requirements.
**Status:** Implemented, integration-tested (20/20 passing), not yet deployed.
**Evidence:** `security-tests/evidence/admin-fixes-test-run.txt` (full `node --test` run log).
**Thesis/documentation (Chapters 4/5) intentionally NOT modified** per instruction; only this report and the earlier `doc/TECHNICAL_STRUCTURE_REPORT.md` exist.

---

## Summary of each issue (Issue → Root cause → Files → Exact change → Tests → Before/After → HTTP codes → Remaining → DB)

### Issue 1 — Report assignment must target Environmental Admins

- **Root cause:** `assignReportService` used `HazardReport.findByIdAndUpdate(...)` then created an assignment notification with `recipientModel: 'FacultyAdmin'`. No validation that `adminId` is an Environmental Admin.
- **Files changed:** `envro-backend/src/modules/report/service.js`, `envro-backend/src/modules/report/controller.js` (no change needed — controller already passed actor).
- **Exact change:**
  - `import { EnvironmentalAdmin } from '../environmentalAdmin/model.js';`
  - `assignReportService` now: finds the report; resolves `adminId` against `EnvironmentalAdmin` (`404` if not found, `400` if inactive); sets `report.assignedTo = adminId` and saves; re-queries with `populate('assignedTo','fullName email')`; `addAssignedEvent(..., assignee.fullName, ...)`; notification `recipientModel: 'EnvironmentalAdmin'`.
- **Tests:** "Issue 1: assign report only to an EnvironmentalAdmin; recipient is EnvironmentalAdmin" (asserts `assignedTo === env2`, notification `recipient === env2`, `recipientModel === 'EnvironmentalAdmin'`, **zero** `FacultyAdmin` `report_assigned` notifications); "Issue 1b: assigning to a non-EnvironmentalAdmin is rejected (404)".
- **Before:** assignee validated as an ObjectId only; notification went to `FacultyAdmin`. **After:** assignee must be an existing active Environmental Admin; notification always targets the assigned Environmental Admin; assigning to a FacultyAdmin returns `404`.
- **HTTP codes:** existing admin → `200`; non-EnvironmentalAdmin or nonexistent id → `404`; inactive admin → `400`.
- **Remaining:** UI integration unchanged (already correct — see Issue 5 note). No DB change (report.assignedTo already references EnvironmentalAdmin).
- **DB migration:** none.

### Issue 2 — FacultyAdmin report-by-ID faculty scope

- **Root cause:** `getReportByIdService` only scoped `departmentAdmin` by faculty (`userRole === 'departmentAdmin'`), leaving `facultyAdmin` able to read any report by ID; students were unscoped too.
- **Files changed:** `envro-backend/src/modules/report/service.js`, `envro-backend/src/modules/report/controller.js`.
- **Exact change:** service signature `getReportByIdService(reportId, userRole, userFaculty, userId)`; filters: `student` → `{ _id, reportedBy: userId }`; `departmentAdmin`/`facultyAdmin` → `{ _id, faculty: userFaculty }`; environmentalAdmin → id only. Controller passes `req.user.id`.
- **Tests:** "Issue 2" (facultyAdmin own-faculty 200 / cross-faculty 404; departmentAdmin same); "Issue 2b" (student own 200 / other-student-reporter 404).
- **Before:** facultyAdmin cross-faculty GET returned 200. **After:** cross-faculty returns `404`; students can only read their own reports.
- **HTTP codes:** 200 (own), 404 (out-of-scope or missing).
- **Remaining:** none known. **DB migration:** none.

### Issue 3 — FacultyAdmin department scope from DB (never trust client)

- **Root cause:** `authorizeFaculty` read `req.params.facultyId`/`req.body.faculty`/`req.query.faculty`; department routes use `:id`, so for update/toggle/delete the check silently passed (no faculty in body), letting a FacultyAdmin of one faculty mutate a department of another faculty. No server-side lookup.
- **Files changed:** `envro-backend/src/middleware/rbac.js`.
- **Exact change:** `authorizeFaculty` is now async. Environmental admins bypass. For faculty/department admins with a faculty: supplied-faculty claims (body/query/params.facultyId) must match; for `:id` routes the **department's actual faculty is resolved via `Department.findById(id).select('faculty')`** and mismatches → 403; missing department → 404; create without provable scope → 403. Express-validator compatibility preserved (route ordering unchanged).
- **Tests:** "Issue 3" (cross-faculty create 403, update/toggle/delete 403, own-faculty update 200 with committed change); "Issue 3b" (own-faculty create 201).
- **Before:** cross-faculty update/toggle/delete were allowed (200). **After:** all cross-faculty mutations rejected (403); verify-by-DB.
- **HTTP codes:** 403 cross-faculty, 404 unknown department, 200/201 in-scope.
- **Remaining:** middleware now does one extra `Department` lookup per protected request (negligible). **DB migration:** none.

### Issue 4 — Backend-enforced status transitions

- **Root cause:** `updateReportStatusService` set `report.status = status` unconditionally (validation only checked the enum), so pending→resolved and backward transitions were accepted.
- **Files changed:** `envro-backend/src/modules/report/service.js`, `envro-frontend/src/screens/admin/AdminReportDetailScreen.tsx`.
- **Exact change:** exported `VALID_STATUS_TRANSITIONS` = `{ pending: [under_review], under_review: [in_progress], in_progress: [resolved], resolved: [] }` and `canTransitionStatus`; service rejects invalid/backward transitions with `ApiError(400)` **before** mutating status / pushing history / emitting timeline events. Frontend now renders only the allowed next action(s) via `getAllowedActions(report.status)`.
- **Tests:** "Issue 4": pending→under_review 200; under_review→resolved 400 (assert status still `under_review`, `statusHistory.length === 1`, no `resolvedAt`); under_review→in_progress→resolved 200 (assert `resolvedAt` set); resolved→pending 400 (assert unchanged). "Issue 4b": transition map shape.
- **Before:** any enum value accepted from any state; `resolvedAt` set automatically. **After:** strict forward chain; terminal at resolved; `resolvedAt` set only on reaching resolved; invalid transitions leave status/history/timeline untouched.
- **HTTP codes:** 200 valid, 400 invalid, 404 unknown report.
- **Remaining:** none. **DB migration:** none (existing reports keep `resolvedAt` semantics; `under_review` reports created before this change continue from under_review).

### Issue 5 — Assignment notification must reach the assigned Environmental Admin

- **Root cause:** folded into Issue 1 (`recipientModel: 'FacultyAdmin'`).
- **Exact change:** notification `recipient = assignedTo`, `recipientModel: 'EnvironmentalAdmin'`, `type: report_assigned`, related Report entity; push parsed via `sendPushNotification` (Expo; skips when no device token — evidence log shows "Found 0 active device token(s)" for the assigned EnvironmentalAdmin).
- **Tests:** "Issue 1" asserts notification recipient equality + model + absence of FacultyAdmin assignment notifications; "Issue 5" covered by the same assertions.
- **HTTP codes:** n/a.
- **Remaining:** real device-token push requires registered tokens + Expo project; DB-level notification is verified.
- **DB migration:** none.

### Issue 6 — Audit log must identify the real admin actor

- **Root cause:** `deleteFacultyService(facultyId)` and `deleteDepartmentService(departmentId)` created audit entries with **no actor/actorModel** (defaulted to `System`, then nulled by the audit writer). Department create/update/toggle passed an actor but no `actorModel`, so they resolved to System as well.
- **Files changed:** `envro-backend/src/modules/faculty/service.js`, `envro-backend/src/modules/faculty/controller.js`, `envro-backend/src/modules/department/service.js`, `envro-backend/src/modules/department/controller.js`, `envro-backend/src/services/audit.service.js`.
- **Exact change:**
  - `deleteFacultyService(facultyId, actorId)` → audit `{ actor: actorId, actorModel: 'EnvironmentalAdmin', action: 'delete_faculty', ... }`, awaited.
  - `deleteDepartmentService(departmentId, actorId, actorModel)` → audit `{ actor, actorModel, action: 'delete_department', ... }`, awaited.
  - Department create/update/toggle now accept `actorModel` (derived from `req.user.role` via new exported `roleToActorModel`) and record it; all four department audits awaited.
  - `createAuditLog` now auto-resolves `actorName` (lookup on the referenced model using `fullName`/`firstName lastName`/`email`) when not supplied, and nulls actors whose model isn't in the allowed set.
- **Tests:** "Issue 6" (delete faculty by env1 → audit has `actor === env1`, `actorModel === 'EnvironmentalAdmin'`, `actorName` non-empty); "Issue 6b" (delete department likewise); "Issue 6c" (dept create/update by faculty admin → audit `actorModel === 'FacultyAdmin'`, actor + faculty recorded).
- **Before:** delete-faculty/delete-department audit rows had System/null actor. **After:** every admin CRUD row carries the real actor id, model, and name.
- **HTTP codes:** unchanged (200 deletes; 404 missing).
- **Remaining:** `deleteEnvironmentalAdminService` still logs without actor (route fires `logAction('EnvironmentalAdmin','delete')` which now does record the acting env admin via middleware — acceptable; noted as optional hardening). **DB migration:** none (old System rows keep `actor: null`; list handles them — see Issue 7).

### Issue 7 — Audit-log HTTP 500 root cause + robustness

- **Root cause (500):** Logged occurrences of 500 on `GET /audit-logs` came from a MongoDB regex cast error on an unescaped `search` value (e.g. `search=[` → `Invalid regular expression`), and from `new Date('garbage')` (Invalid Date) being passed into `$gte`. A second latent issue: `resolveActorNames` selected `firstName lastName email` while admin models use `fullName` (names never resolved; StudentAccount has no email).
- **Files changed:** `envro-backend/src/modules/audit/service.js`, `envro-backend/src/services/audit.service.js`.
- **Exact change:** `escapeRegex()` applied to `search`; `dateFrom`/`dateTo` validated with `Date.parse` and only applied when valid; `resolveActorNames` selects `fullName firstName lastName email` and prefers `fullName`.
- **Tests:** "Issue 7" (EnvironmentalAdmin 200 system-wide; FacultyAdmin 200 with **every** returned log's `faculty` equal to their own faculty; DepartmentAdmin 403; anonymous 401); "Issue 7b" (`?dateFrom=not-a-date&dateTo=also-bad&page=abc&limit=999999&search=[` → 200; clean pagination → 200); "Regression T32" (System-actor record listed without crash, `actorName` lookup non-crashing).
- **Before:** malformed filters → 500; actor names blank. **After:** malformed filters → 200 (invalid fields ignored); `limit` clamped to ≤100; names resolved from `fullName`.
- **HTTP codes:** 200 (env/faculty), 403 (dept admin), 401 (unauthenticated).
- **Remaining:** none known on this endpoint path.

---

## Regression & security re-verification (all passing)

- **Functional:** T15 (student own reports — covered by Issue 2b/own-list logic), T16 (assignment — Issue 1), T17/T18 (status update/resolution — Issue 4), T25 (env admin provisions another env admin → 201), T26 (role-based access — deactivated admin → 401), T27 (submission notifies faculty admin + env admins), T28 (status change notifies reporter), T31 (submission writes audit log), T32 (audit listing incl. System rows).
- **Security:** S03 (dept admin own-IFT 200 / cross-department 404 — via dept-scoped student by-id in S04 test and report-by-id in Issue 2), S04 (faculty admin list = own faculty only, cross-faculty student by-id → 404), S05 (dept admin audit-logs → 403; env admin dashboard 200), plus deactivated-account token rejection (401).
- **Result:** `ℹ tests 20 / pass 20 / fail 0` (see `security-tests/evidence/admin-fixes-test-run.txt`).
- **Command:** `npm test` in `envro-backend` (Node 24, local MongoDB, isolated `envro-guard-test` DB, seeded fixtures, ephemeral port; no external services required).

---

## Final behavior (as implemented)

- **Admin hierarchy:** EnvironmentalAdmin (system-wide; provisions/manages Environmental Admins and Faculty Admins; assigns reports; updates statuses; manages faculties) → FacultyAdmin (their faculty only; manages departments, department admins, students; never a report assignee) → DepartmentAdmin (their department only; manages students; read-only reports) → Student (own reports, read/edit while pending).
- **Assignment behavior:** assignee is always an active EnvironmentalAdmin; the assigned EnvironmentalAdmin is the notification recipient (`EnvironmentalAdmin`); FacultyAdmins can never be assignees; assignment is env-admin-only.
- **Status transition rules:** `pending → under_review → in_progress → resolved`; `resolved` is terminal; any other/backward transition is `400` and leaves status/history/timeline/resolvedAt untouched; `resolvedAt` is set when `resolved` is reached.
- **Report scope behavior:** EnvironmentalAdmin: all. FacultyAdmin/DepartmentAdmin: own faculty only (by DB-truth on `:id`, forced in list filters). Student: own reports only.
- **Audit behavior:** every admin CRUD records `actor`, `actorModel`, `actorName`; deletions identify the real admin; System/legacy rows render safely; `GET /audit-logs`: env admin 200 (all), faculty admin 200 (own faculty only), department admin 403, anonymous 401; pagination/filtering/sort intact; malformed filters no longer 500.

---

## Remaining issues / notes

- **Deployment:** fixes are in `envro-backend` (unstaged). They must be committed, pushed, and **redeployed on Render**, then a hard refresh performed by testers. No `render.yaml` at the repo root — auto-deploy config lives in the Render dashboard.
- **Push notifications:** assignment/submission/status pushes require the assigned admin to have a registered device token and an active Expo project token; the DB notification layer is verified.
- **Pre-existing:** iOS device distribution still blocked ($99 Apple Developer Program required). Thesis Chapters 4/5 remain unmodified.
- **No DB migrations** were required for any of the 7 fixes.