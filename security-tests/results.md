# EnviroGuard — Security & Access-Control Test Results (S01–S06)

Live deployment under test: `https://envroguard-tmjk.onrender.com/api/v1`
Executed: 08 Sep 2026 (UTC). Tool: `curl` (HTTP), JSON responses saved verbatim (see Section A).
All config: 1 request per test (no load), read-only GET endpoints used throughout except where noted.

## Roles and Accounts Used

| Role (system value) | Account (masked) | Scope |
|---|---|---|
| environmentalAdmin | admin@e******om | System-wide |
| facultyAdmin | chinomso******@gmail.com | SICT faculty |
| departmentAdmin | boltgood******@gmail.com | SICT > IFT department |
| student (StudentAccount) | reg 20211278052 | SICT > IFT student |

Credentials and bearer tokens are intentionally omitted from this report.

## Results Summary

| # | Test | Request | Expected | Actual | Result |
|---|---|---|---|---|---|
| S01 | Unauthenticated access | `GET /students` (no token) | 401, protected data not returned | 401 `Access token is required` | PASS |
| S02 | Student using admin function | `GET /students` (student token) | 403 | 403 `You do not have permission to perform this action` | PASS |
| S03 | Department scope (IFT dept admin) | a) `GET /students/{IFT student}` — within dept | 200 | 200 `Student retrieved` | PASS |
| | | b) `GET /students/{CSC student}` — same faculty, other dept | 404 | 404 `Student not found` | PASS |
| | | c) `GET /students?department=CSC` — dept override attempt | own dept enforced | 200; all 9 returned students are IFT | PASS |
| S04 | Faculty scope (SICT faculty admin) | a) `GET /students` | only own faculty | 200; 24/24 students in SICT (IFT/CSC/SOE/CYB) | PASS |
| | | b) `GET /students/{SOE student}` — own faculty, other dept | 200 | 200 `Student retrieved` | PASS |
| | | c) `GET /students/{non-SICT id}` | 404 | 404 `Student not found` | PASS |
| S05 | Restricted admin operation | a) deptAdmin → `GET /audit-logs` (env+faculty only) | 403 | 403 permission denied | PASS |
| | | b) facultyAdmin → `GET /environmental-admin/dashboard` (env only) | 403 | 403 permission denied; control (envAdmin, same endpoint) → 200 `System dashboard retrieved` | PASS |
| S06 | Invalid / expired token | a) `Bearer invalid.test.token` | 401 | 401 `Invalid or expired token` | PASS |
| | | b) `Bearer abc` (malformed) | 401 | 401 `Invalid or expired token` | PASS |
| | | c) Real token, one character tampered | 401 | 401 `Invalid or expired token` | PASS |

All six security/access-control tests PASS. Every policy check was implemented by the
backend itself (JWT `authenticate` + role `authorize` middleware and controller/service-level
scope filters); no rule was bypassed, weakened, or disabled during testing.

## A. Evidence Files

`security-tests/evidence/` contains the verbatim server responses (15 files):
`s01-no-token.json`, `s02-student-token.json`, `s03a-dept-own-ift-200.json`,
`s03b-dept-csc-404.json`, `s03c-dept-query-override.json`, `s04a-facultylist-sict.json`,
`s04b-in-faculty-soe-200.json`, `s04c-non-sict-404.json`, `s05a-dept-audit-403.json`,
`s05b-faculty-envdash-403.json`, `s05c-envadmin-dash-200.json`, `s05d-envadmin-audit-500.json`,
`s06a-invalid-token-401.json`, `s06b-malformed-401.json`, `s06c-tampered-401.json`.

## B. HTTP Semantics and Authorization Architecture

1. Authentication is stateless JWT. `authenticate` resolves the account by role (single token
   pool across `StudentAccount`, `DepartmentAdmin`, `FacultyAdmin`, `EnvironmentalAdmin`).
   Missing token → **401** `Access token is required`; unverifiable token → **401**
   `Invalid or expired token`.
2. Authorization uses role-based middleware (`authorize(...allowedRoles)`); a valid token with
   a disallowed role → **403** `You do not have permission to perform this action`.
3. Scope (tenant) restrictions are enforced server-side in the controllers/services, not by the
   client: student reads append `faculty` (and for dept admins `department`) to every find
   filter. This is why S03c still returned only IFT students despite the `?department=CSC` query.
4. Status transitions on reports (`PATCH .../status`, `DELETE`) are restricted to
   environmentalAdmin only (highest role) — this is the natural S05 target and is correctly gated.

## C. Caveats / Limitations

1. **S04 dataset limitation:** the seeded production dataset contains students only in SICT.
   A real record belonging to another faculty could not be exercised; the negative check used a
   non-SICT ObjectId (404) and the server-side `filters.faculty` filter is confirmed in code.
   The SICT-only list output and the in-faculty cross-department 200 read corroborate that the
   filter is active.
2. **S06 genuinely-expired token:** a token whose `exp` has lapsed but which is signed with the
   production secret cannot be fabricated without the server's signing key (env-only, not in repo).
   All untrusted tokens (malformed / invalid / tampered) fail at signature verification in the
   same 401 path; the middleware treats expired and invalid tokens identically.
3. Testing was read-only: no records were created, modified, or deleted. Incidental login
   audit-log entries were written by the server (expected behavior).

## D. Environment

- Base URL: `https://envroguard-tmjk.onrender.com/api/v1`
- API response envelope: `{ success, message, data, meta }`
- Rate limiting (observed headers): auth endpoints `20 req/15 min/IP`; OTP `5 req/5 min/IP`.
  Budget confirmed before the runs (`ratelimit-remaining: 19`), so no test was throttled.
- Date/time: 2026-09-08.

## E. Residual Observations (not part of the six tests)

1. **`GET /audit-logs` returns HTTP 500 for authorized roles.** Both a system admin and an
   SICT faculty admin (faculty-scoped query, `page=1&limit=5`) consistently received
   `500 Internal server error` (evidence: `s05d-envadmin-audit-500.json`). The route and RBAC
   are correct (403 for dept admin, allowed roles vs denied roles behave as designed); the 500
   occurs inside the controller/service. Likely cause hypothesis: `AuditLog.find(...).populate('actor')`
   with `refPath: 'actorModel'` — any audit document whose `actorModel` is `'System'` (the
   schema default) while `actor` holds a non-null value makes populate query the unregistered
   model name `System`, throwing before a response is built. Requires verification in server
   logs / the production DB (not reachable from here — local `.env` points to a local MongoDB).
2. **Report list faculty scoping for faculty admins is client-driven.** `GET /reports`
   (`getAllReportsService`) applies an automatic faculty filter only for department admins;
   for faculty admins the list respects the `?faculty=` query value the client sends and does
   not cross-check it against the logged-in admin's faculty. No cross-faculty reports exist in
   the current dataset, so nothing leaks today, but the enforcement is weaker than the students
   module. Recommended fix: reuse the same server-side scope filter as the students module.