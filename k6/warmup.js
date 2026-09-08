// k6 warm-up script - Environmental Hazard Alert System API
//
// Small, low-traffic warm-up sequence run BEFORE the measured performance test.
// It hits only public (non-authenticated) endpoints, so it does not consume
// the auth rate-limit budget, and it lets the Render-hosted server become
// fully active (its Sleep/Startup behaviour) before real measurements begin.
//
// Configuration:
//   API_BASE_URL - default https://envroguard-tmjk.onrender.com/api/v1

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = String(__ENV.API_BASE_URL || 'https://envroguard-tmjk.onrender.com/api/v1').replace(/\/+$/, '');

export const options = {
  scenarios: {
    warmup: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate==0'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/faculties`, { tags: { purpose: 'warmup' } });
  check(res, { 'warmup GET /faculties 200': (r) => r.status === 200 });
  sleep(0.5);
}