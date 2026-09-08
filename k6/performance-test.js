// k6 performance test - Environmental Hazard Alert System API
//
// Measures response-time performance of 5 representative API operations:
//   P01 - Login (administrator)
//   P02 - Retrieve Hazard Reports
//   P03 - Submit Hazard Report
//   P04 - Retrieve Notifications
//   P05 - Update Hazard Report Status
//
// Configuration via environment variables (k6 -e NAME=VALUE):
//   API_BASE_URL       - default https://envroguard-tmjk.onrender.com/api/v1
//   ADMIN_EMAIL        - default admin@enviroguard.com
//   ADMIN_PASSWORD     - required (do not hardcode)
//   ADMIN_ROLE         - default environmentalAdmin
//   STUDENT_REG_NO     - default 20211278052
//   STUDENT_PASSWORD   - required (do not hardcode)
//   ITERATIONS         - default 18
//
// Safety: the report created by P03 is deleted at the end of each iteration
// (cleanup). The student login used to create reports runs once in setup().

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE_URL = String(__ENV.API_BASE_URL || 'https://envroguard-tmjk.onrender.com/api/v1').replace(/\/+$/, '');

const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@enviroguard.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || '';
const ADMIN_ROLE = __ENV.ADMIN_ROLE || 'environmentalAdmin';
const STUDENT_REG_NO = __ENV.STUDENT_REG_NO || '20211278052';
const STUDENT_PASSWORD = __ENV.STUDENT_PASSWORD || '';
const ITERATIONS = Number(__ENV.ITERATIONS || 18);

if (!ADMIN_PASSWORD || !STUDENT_PASSWORD) {
  throw new Error('Missing credentials. Provide ADMIN_PASSWORD and STUDENT_PASSWORD via -e.');
}

// ─── Custom metrics (one series per logical operation) ────────────────────
const P01_login = new Trend('P01_login_duration_ms', true);
const P02_list = new Trend('P02_list_reports_duration_ms', true);
const P03_create = new Trend('P03_create_report_duration_ms', true);
const P04_notif = new Trend('P04_notifications_duration_ms', true);
const P05_status = new Trend('P05_update_status_duration_ms', true);
const setup_login = new Trend('setup_student_login_duration_ms', true);
const cleanup_delete = new Trend('cleanup_delete_duration_ms', true);

const P01_login_failures = new Counter('P01_login_failures');
const P02_list_failures = new Counter('P02_list_reports_failures');
const P03_create_failures = new Counter('P03_create_report_failures');
const P04_notif_failures = new Counter('P04_notifications_failures');
const P05_status_failures = new Counter('P05_update_status_failures');
const cleanup_failures = new Counter('cleanup_delete_failures');

export const options = {
  scenarios: {
    perf_test: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: ITERATIONS,
      maxDuration: '15m',
    },
  },
  thresholds: {
    // Correctness gate: the whole test is marked failed if any request errors
    // (network failure or non-2xx). This is not a performance claim.
    http_req_failed: ['rate==0'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Obtains the student access token ONCE (used to submit hazard reports).
export function setup() {
  const body = JSON.stringify({ registrationNumber: STUDENT_REG_NO, password: STUDENT_PASSWORD });
  const res = http.post(`${BASE_URL}/auth/student/login`, body, { headers: JSON_HEADERS });
  setup_login.add(res.timings.duration);
  const ok = check(res, {
    'setup student login 200': (r) => r.status === 200,
    'setup student token present': (r) => r.status === 200 && !!r.json().data.accessToken,
  });
  if (!ok) {
    console.error('SETUP FAILED: student login unsuccessful.');
    return null;
  }
  return res.json().data.accessToken;
}

export default function (studentToken) {
  let adminToken = '';

  // ─── P01 Login (environmental administrator) ────────────────────────────
  {
    const body = JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: ADMIN_ROLE });
    const res = http.post(`${BASE_URL}/auth/admin/login`, body, { headers: JSON_HEADERS });
    P01_login.add(res.timings.duration);
    const ok = check(res, {
      'P01 login status 200': (r) => r.status === 200,
      'P01 login returns access token': (r) => r.status === 200 && !!r.json().data.accessToken,
    });
    if (!ok) P01_login_failures.add(1);
    if (res.status === 200) adminToken = res.json().data.accessToken;
  }

  const authHeader = { Authorization: `Bearer ${adminToken}` };

  // ─── P02 Retrieve Hazard Reports (environmental administrator) ──────────
  if (adminToken) {
    const res = http.get(`${BASE_URL}/reports?page=1&limit=10`, { headers: authHeader });
    P02_list.add(res.timings.duration);
    const ok = check(res, { 'P02 list reports status 200': (r) => r.status === 200 });
    if (!ok) P02_list_failures.add(1);
  }

  // ─── P03 Submit Hazard Report (student) ────────────────────────────────
  let reportId = null;
  if (studentToken) {
    const uniq = `${Date.now()}_vu${__VU}_it${__ITER}`;
    const body = JSON.stringify({
      title: `K6 Perf Test Report ${uniq}`,
      description: 'Automated k6 performance test report. Created and deleted automatically; not a real hazard.',
      category: 'Others',
      address: 'K6 Test Location, Federal University of Technology Owerri',
      latitude: 6.531491,
      longitude: 3.364927,
    });
    const res = http.post(`${BASE_URL}/reports`, body, {
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${studentToken}` },
    });
    P03_create.add(res.timings.duration);
    const ok = check(res, { 'P03 create report status 201/200': (r) => r.status === 200 || r.status === 201 });
    if (!ok) {
      P03_create_failures.add(1);
    } else {
      reportId = res.json().data._id;
      if (!reportId) {
        console.error('P03 create succeeded but no report _id in response.');
        P03_create_failures.add(1);
      }
    }
  }

  // ─── P04 Retrieve Notifications (environmental administrator) ───────────
  if (adminToken) {
    const res = http.get(`${BASE_URL}/notifications?page=1&limit=10`, { headers: authHeader });
    P04_notif.add(res.timings.duration);
    const ok = check(res, { 'P04 notifications status 200': (r) => r.status === 200 });
    if (!ok) P04_notif_failures.add(1);
  }

  // ─── P05 Update Report Status (environmental administrator) ─────────────
  if (adminToken && reportId) {
    const body = JSON.stringify({
      status: 'under_review',
      note: 'Automated k6 performance test status change',
    });
    const res = http.patch(`${BASE_URL}/reports/${reportId}/status`, body, {
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${adminToken}` },
    });
    P05_status.add(res.timings.duration);
    const ok = check(res, { 'P05 update status 200': (r) => r.status === 200 });
    if (!ok) P05_status_failures.add(1);
  }

  // ─── Cleanup: delete the report created by P03 ──────────────────────────
  if (adminToken && reportId) {
    const res = http.del(`${BASE_URL}/reports/${reportId}`, null, { headers: authHeader });
    cleanup_delete.add(res.timings.duration);
    const ok = check(res, { 'cleanup delete report 200': (r) => r.status === 200 });
    if (!ok) cleanup_failures.add(1);
  }

  // Gentle pacing between iterations (avoids an uncontrolled burst).
  sleep(0.2);
}