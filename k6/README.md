# k6 Performance & Response-Time Test — Environmental Hazard Alert System

Measured on **08 September 2026** against the production deployment:

```
Target server : https://envroguard-tmjk.onrender.com (API base: https://envroguard-tmjk.onrender.com/api/v1)
Tool          : k6 v2.2.0 (Grafana k6)
```

## 1. How the test was run

Both scripts are executed with the Grafana k6 CLI on this machine:

```
k6 run warmup.js
k6 run --summary-export results/summary.json --out json=results/raw-export.json \
  performance-test.js
```

Sensitive values (passwords) are injected at run time with `k6 -e NAME=VALUE`.
They are **not** stored in any file in this directory.

## 2. Endpoints tested

| ID  | Logical operation         | Method | Endpoint                                      | Authenticated as            |
| --- | ------------------------- | ------ | --------------------------------------------- | --------------------------- |
| P01 | Login                     | POST   | `/auth/admin/login`                           | Environmental Admin         |
| P02 | Retrieve Hazard Reports   | GET    | `/reports?page=1&limit=10`                    | Environmental Admin         |
| P03 | Submit Hazard Report      | POST   | `/reports`                                    | Student (Reg. 20211278052)  |
| P04 | Retrieve Notifications    | GET    | `/notifications?page=1&limit=10`              | Environmental Admin         |
| P05 | Update Report Status      | PATCH  | `/reports/{id}/status`                        | Environmental Admin         |

Supporting requests (excluded from the five measured operations):

| Purpose        | Method | Endpoint                          | Auth                        |
| -------------- | ------ | --------------------------------- | --------------------------- |
| Setup          | POST   | `/auth/student/login`             | Student (once, pre-test)    |
| Cleanup        | DELETE | `/reports/{id}`                   | Environmental Admin         |
| Warm-up        | GET    | `/faculties` (public)             | None (see section 4)        |

The exact request bodies were taken from the backend source:

- Admin login: `{ "email": ..., "password": ..., "role": "environmentalAdmin" }`
  (the role selects the EnvironmentalAdmin model, per `auth/service.js`).
- Create report: `{ "title", "description", "category": "Others", "address",
  "latitude": 6.531491, "longitude": 3.364927 }` — category chosen from the
  validated `HAZARD_CATEGORIES` constant.
- Update status: `{ "status": "under_review", "note": "..." }` — `under_review`
  is one of the validated `REPORT_STATUS` values.

## 3. Account used

- **Environmental Administrator** (P01, P02, P04, P05, cleanup):
  `admin@enviroguard.com` — role `environmentalAdmin`.
- **Student** (P03): registration number `20211278052`.

Passwords are supplied via environment variables at run time and are not saved.

## 4. Warm-up / Render cold-start handling

1. A `GET /health` poll was run first (PowerShell loop) to bring the Render
   instance up and detect any cold start. **Result: the instance was already
   active and responded on the first probe (≈1.0 s); no cold-start delay was
   observed during this session.**
2. A k6 warm-up script (`warmup.js`) then sent **5 requests** to the public
   endpoint `GET /faculties` (5/5 HTTP 200, avg ≈ 304 ms). These warm-up
   requests are separate from the measured run and are **not** included in the
   results below.
3. Only after the server was confirmed active was the measured test started.

## 5. Test configuration

| Setting          | Value                                  |
| ---------------- | -------------------------------------- |
| Concurrency (VUs)| 1                                      |
| Iterations       | 18 (one full P01–P05 sequence each)    |
| Requests / op    | 18                                     |
| Total requests   | 109 (90 measured + 1 setup + 18 cleanup) |
| Measured duration| ≈ 1 min 15 s                          |
| Pacing           | 0.2 s sleep between iterations         |

The iteration count was set to **18 instead of 20** to stay inside the
production authentication rate limit (`authRateLimit`: 20 login requests per
15 minutes per IP, measured `ratelimit-remaining: 19` before the run). 18 is
"approximately 20" as requested, and every login succeeds under that limit.

## 6. Safety with production data

- Report submission (P03) creates real documents in the production database.
  To avoid leaving test pollution, each iteration submits **one** report and
  then deletes it (P05 update + cleanup delete run against that same report).
- After the run, the reports list was re-checked with `?search=K6`:
  **0 test reports remained** in production.
- Residual effect: the same in-app notifications and audit-log entries that any
  real report creates are still produced (a few dozen records). These cannot be
  removed via the API without removing real data; the report documents
  themselves were cleaned up.
- No other production data was modified.

## 7. Results (actual measured values)

All times are milliseconds; per-operation samples = 18.

| Test ID | API Operation           | Requests | Avg   | Min | Med   | Max    | p95   | Failed | Failure Rate |
| ------- | ----------------------- | -------: | -----: | ---: | ----: | -----: | -----: | -----: | -----------: |
| P01     | Login                   |       18 | 1802.0 | 1707.4 | 1796.3 | 2174.4 | 1886.4 | 0 | 0.0% |
| P02     | Retrieve Hazard Reports |       18 | 381.2 | 323.1 | 339.5 | 788.7 | 525.0 | 0 | 0.0% |
| P03     | Submit Hazard Report    |       18 | 443.2 | 389.4 | 417.7 | 838.0 | 505.3 | 0 | 0.0% |
| P04     | Retrieve Notifications  |       18 | 408.2 | 288.0 | 316.8 | 1619.7 | 702.9 | 0 | 0.0% |
| P05     | Update Report Status    |       18 | 454.3 | 355.2 | 414.5 | 1084.7 | 579.8 | 0 | 0.0% |

Supporting measurements (not part of the five operations):

| Purpose      | Requests | Avg   | Med   | Max    |
| ------------ | -------: | -----: | -----: | -----: |
| Student login (setup, 1 req) | 1 | 1938.4 | 1938.4 | 1938.4 |
| Cleanup delete (18 reqs)      | 18 | 321.2 | 316.9 | 342.9 |

Overall (all 109 requests): avg 647.0 ms, min 288.0 ms, med 404.0 ms,
max 2174.4 ms, p95 1803.2 ms, **0 failed (0.0 %)**. All 128 k6 checks passed.

## 8. Files in this directory

| File                      | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `performance-test.js`     | Main measured k6 script (P01–P05 + cleanup)        |
| `warmup.js`               | Warm-up k6 script (public endpoint)                |
| `results/summary.json`    | k6 summary-export (all metrics, machine readable)  |
| `results/raw-export.json` | k6 raw JSON-Lines event export (every request)     |
| `results/perf-console.txt`| Full k6 console output of the measured run         |
| `results/warmup-summary.json` | k6 summary of the warm-up run                  |
| `results/warmup-console.txt`  | Warm-up console output                         |

## 9. Interpretation

- **Fastest operation:** Retrieve Hazard Reports (P02), median ≈ 340 ms.
- **Slowest operation:** Login (P01), median ≈ 1796 ms — expected, because
  login performs a bcrypt password comparison (cost factor 12) plus JWT
  signing and a database update.
- **Failures:** none. Every request of every operation returned an HTTP 2xx
  response; the failure rate is 0.0 %.
- **Consistency:** P02/P03/P05 medians cluster around 340–420 ms. P04 had the
  highest variability (median ≈ 317 ms but one sample at ≈ 1620 ms), and P02
  and P05 each show a single slower sample (≈ 789 ms and ≈ 1085 ms). Apart from
  login, response times were generally consistent.
- **Cold start:** not observed in this session; the instance was already
  active, so the figures above represent normal running-response performance.