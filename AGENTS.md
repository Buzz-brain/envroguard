# EnviroGuard — Project Working Notes

## Overview
Campus environmental hazard reporting system.
- `envro-backend/` — Node.js + Express + Mongoose API (`src/`), monorepo root also hosts this file.
- `envro-frontend/` — React Native (Expo SDK 56) app (see `envro-frontend/AGENTS.md`).
- Backend deployed on Render (auto-deploy from `main`); database MongoDB Atlas; push via Expo push service.
- Local backend stack: MongoDB at `127.0.0.1:27017`; `.env` holds `MONGODB_URI`, `JWT_SECRET`, etc. (committed `.env` files are NOT in the repo).

## Administrative responsibility model (as-built)
- **environmentalAdmin** — system-wide: provisions/manages Environmental Admins and Faculty Admins, manages faculties, **assigns reports**, **updates report statuses**.
- **facultyAdmin** — own faculty only: manages departments, department admins, students; read-only reports; **never a report assignee**.
- **departmentAdmin** — own department only: manages students; read-only reports; **never a report assignee**.
- **student** — reports, tracks own reports; sees own reports only.
- Status flow: `pending → under_review → in_progress → resolved` (resolved terminal; backward/skip transitions rejected with 400).
- Audit logs: every admin CRUD records real actor, actorModel, actorName; `GET /audit-logs` — envAdmin 200 (all), facultyAdmin 200 (own faculty), departmentAdmin 403, anonymous 401.

## Backend commands
- `npm start` — production start (`src/server.js`)
- `npm run dev` — nodemon
- `npm test` — integration suite `test/fixes.test.js` (Node built-in runner; isolated `envro-guard-test` DB, seeded fixtures, ephemeral port). Requires local MongoDB.
- `npm run seed` — `src/scripts/seedEnvironmentalAdmin.js`

## Frontend commands
- `npm start` / `npm run android` / `npm run ios`
- `npx tsc --noEmit` — typecheck

## Progress log
- 2026-09-18 — **Administrative responsibility fixes** (commit `b481e1b`, pushed; auto-redeploy on Render).
  - Report assignment targets active EnvironmentalAdmin only (`recipientModel: 'EnvironmentalAdmin'`).
  - `getReportByIdService` faculty-scopes facultyAdmin/departmentAdmin, ownership-scopes students.
  - `authorizeFaculty` resolves target department's faculty from DB (client faculty no longer trusted).
  - Status transitions enforced backend + frontend (only valid next action shown).
  - Audit log actor attribution: real actor/actorModel/actorName for department & faculty CRUD/deletes.
  - Audit GET hardened: regex-escaped `search`, validated `dateFrom/dateTo`, `fullName` actor lookup.
  - Added `test/fixes.test.js` — **20/20 passing**; evidence `security-tests/evidence/admin-fixes-test-run.txt`.
  - Reports: `doc/ADMINISTRATIVE_ROLE_FIXES_REPORT.md`, `doc/TECHNICAL_STRUCTURE_REPORT.md` (12 standalone Mongoose models; embedded `images[]/statusHistory[]/timeline[]`).
- Prior: audit-log 500 fix (`6204370`) — user confirmed live page no longer crashes.

## Open / blocked items
- After new commit deploys on Render, testers must **hard-refresh** the app.
- Push notifications need real device tokens + Expo project token; DB notification layer verified.
- iOS device distribution blocked (no $99 Apple Developer Program account).
- Thesis Chapters 4/5 not yet updated (pending verified test evidence).