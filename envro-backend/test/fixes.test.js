process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/envro-guard-test';
process.env.RATE_LIMIT_WINDOW_MS = '600000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';
// Geocoding is off by default so the rest of the suite never touches the
// network; the GEO-* tests below enable it against a local stub server.
process.env.GEOCODE_ENABLED = 'false';

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';

import { app } from '../src/app.js';
import { generateTokens } from '../src/middleware/auth.js';
import { ROLES } from '../src/constants/roles.js';

import { Faculty } from '../src/modules/faculty/model.js';
import { Department } from '../src/modules/department/model.js';
import { EnvironmentalAdmin } from '../src/modules/environmentalAdmin/model.js';
import { FacultyAdmin } from '../src/modules/facultyAdmin/model.js';
import { DepartmentAdmin } from '../src/modules/departmentAdmin/model.js';
import { Student } from '../src/modules/student/model.js';
import { StudentAccount } from '../src/modules/auth/model/StudentAccount.js';
import { HazardReport } from '../src/modules/report/model.js';
import { Notification } from '../src/modules/notification/model.js';
import { AuditLog } from '../src/modules/audit/model.js';
import { VALID_STATUS_TRANSITIONS } from '../src/modules/report/service.js';

const BASE = '/api/v1';
let server;
let baseUrl;

// Local stand-in for the OpenStreetMap Nominatim API. Tests can swap out
// `nominatimResponder` to simulate success or failure.
let nominatimServer;
let nominatimResponder = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      display_name: 'Ihiagwa, Owerri West, Imo, Nigeria',
      address: {
        village: 'Ihiagwa',
        county: 'Owerri West',
        state: 'Imo',
        country: 'Nigeria',
      },
    })
  );
};

const postReport = (token, body) =>
  get(token, `${BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const sampleReportBody = (overrides = {}) => ({
  title: 'Overflowing bin near gate',
  description: 'Refuse spilling onto the path.',
  category: 'Waste Dumping',
  address: 'Main gate, IFT block',
  latitude: 5.380758,
  longitude: 6.989511,
  ...overrides,
});

const f = {
  facultyA: null,
  facultyB: null,
  deptA: null,
  deptB2: null,
  env1: null,
  env2: null,
  faA: null,
  daA: null,
  student: null,
  studentAccount: null,
  student2: null,
  studentAccount2: null,
  reportA: null,
  reportB: null,
};

const tokenFor = (user, role) => generateTokens(user._id, role).accessToken;
const get = (token, url, init = {}) => {
  const headers = { ...(init.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${url}`, { ...init, headers });
};

const resetDb = async () => {
  for (const model of [
    AuditLog, Notification, HazardReport, StudentAccount, Student,
    DepartmentAdmin, FacultyAdmin, EnvironmentalAdmin, Department, Faculty,
  ]) {
    await model.deleteMany({});
  }
  await mongoose.connection.db.collection('devicetokens').deleteMany({});
  await mongoose.connection.db.collection('otps').deleteMany({});
};

const seed = async () => {
  f.facultyA = await Faculty.create({ name: 'School of ICT (Test)', code: 'SICT' });
  f.facultyB = await Faculty.create({ name: 'College of Science (Test)', code: 'CSC' });

  f.deptA = await Department.create({ name: 'Information Tech (Test)', code: 'IFT', faculty: f.facultyA._id, isActive: true });
  f.deptB2 = await Department.create({ name: 'Computer Science (Test)', code: 'CSC-DEPT', faculty: f.facultyB._id, isActive: true });

  f.env1 = await EnvironmentalAdmin.create({ fullName: 'Env Admin One', email: 'env1@test.com', password: 'password1' });
  f.env2 = await EnvironmentalAdmin.create({ fullName: 'Env Admin Two', email: 'env2@test.com', password: 'password1' });

  f.faA = await FacultyAdmin.create({ fullName: 'Faculty Admin A', email: 'fa@test.com', password: 'password1', faculty: f.facultyA._id });

  f.daA = await DepartmentAdmin.create({ fullName: 'Dept Admin A', email: 'da@test.com', password: 'password1', faculty: f.facultyA._id, department: f.deptA._id });

  f.student = await Student.create({
    registrationNumber: '20211278052',
    fullName: 'Test Student',
    email: 'student@test.com',
    department: 'Information Tech (Test)',
    faculty: f.facultyA._id,
    level: '400',
  });
  f.studentAccount = await StudentAccount.create({ student: f.student._id, registrationNumber: '20211278052', password: 'password1' });

  f.student2 = await Student.create({
    registrationNumber: '20998880001',
    fullName: 'Second Student',
    email: 'student2@test.com',
    department: 'Computer Science (Test)',
    faculty: f.facultyB._id,
    level: '300',
  });
  f.studentAccount2 = await StudentAccount.create({ student: f.student2._id, registrationNumber: '20998880001', password: 'password1' });

  const baseReport = {
    title: 'Flooded walkway near lecture hall',
    description: 'Water-logged for days after heavy rain.',
    category: 'Flooding',
    location: { type: 'Point', coordinates: [3.4, 6.5], address: 'Main walkway, IFT block' },
    reportedBy: f.studentAccount._id,
    studentInfo: { registrationNumber: f.student.registrationNumber, fullName: f.student.fullName, faculty: f.facultyA._id, department: f.deptA.name },
    faculty: f.facultyA._id,
  };
  f.reportA = await HazardReport.create(baseReport);

  f.reportB = await HazardReport.create({
    title: 'Waste dumping behind science labs',
    description: 'Illegal dumping observed.',
    category: 'Waste Dumping',
    location: { type: 'Point', coordinates: [3.42, 6.52], address: 'Science labs' },
    reportedBy: f.studentAccount2._id,
    studentInfo: { registrationNumber: f.student2.registrationNumber, fullName: f.student2.fullName, faculty: f.facultyB._id, department: f.deptB2.name },
    faculty: f.facultyB._id,
  });
};

before(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/envro-guard-test');
  await resetDb();
  await seed();
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  nominatimServer = http.createServer((req, res) => nominatimResponder(req, res));
  await new Promise((resolve) => nominatimServer.listen(0, '127.0.0.1', resolve));
  process.env.NOMINATIM_URL = `http://127.0.0.1:${nominatimServer.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  if (nominatimServer) {
    await new Promise((resolve) => nominatimServer.close(resolve));
  }
  // Let fire-and-forget work (geocoding, timeline, audit, push) settle so it
  // does not touch a closed MongoDB connection.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await mongoose.disconnect();
});

beforeEach(async () => {
  await resetDb();
  await seed();
});

const tokens = () => ({
  env1: tokenFor(f.env1, ROLES.ENVIRONMENTAL_ADMIN),
  env2: tokenFor(f.env2, ROLES.ENVIRONMENTAL_ADMIN),
  fa: tokenFor(f.faA, ROLES.FACULTY_ADMIN),
  da: tokenFor(f.daA, ROLES.DEPARTMENT_ADMIN),
  student: tokenFor(f.studentAccount, ROLES.STUDENT),
});

const waitFor = async (fn, timeoutMs = 3000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await fn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
};

const setStatus = (token, reportId, status, currentStatus, extra = {}) =>
  get(token, `${BASE}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, currentStatus, ...extra }),
  });

test('Issue 1: assign report only to an EnvironmentalAdmin; recipient is EnvironmentalAdmin', async () => {
  const t = tokens();
  const res = await get(t.env1, `${BASE}/reports/${f.reportA._id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminId: f.env2._id.toString() }),
  });
  assert.equal(res.status, 200, await res.text());

  const updated = await HazardReport.findById(f.reportA._id);
  assert.equal(updated.assignedTo.toString(), f.env2._id.toString());

  const notif = await waitFor(() => Notification.findOne({ relatedEntityId: f.reportA._id, type: 'report_assigned' }));
  assert.ok(notif, 'assignment notification should exist');
  assert.equal(notif.recipient.toString(), f.env2._id.toString());
  assert.equal(notif.recipientModel, 'EnvironmentalAdmin');

  const facultyNotif = await Notification.find({ recipientModel: 'FacultyAdmin', type: 'report_assigned' });
  assert.equal(facultyNotif.length, 0, 'no FacultyAdmin assignment notification should exist');
});

test('Issue 1b: assigning to a non-EnvironmentalAdmin is rejected (404)', async () => {
  const t = tokens();
  const res = await get(t.env1, `${BASE}/reports/${f.reportA._id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminId: f.faA._id.toString() }),
  });
  assert.ok([404, 400].includes(res.status), `expected 4xx, got ${res.status}`);
});

test('Issue 2: FacultyAdmin can fetch own-faculty report by ID, cross-faculty report is denied', async () => {
  const t = tokens();
  const own = await get(t.fa, `${BASE}/reports/${f.reportA._id}`);
  assert.equal(own.status, 200);
  const cross = await get(t.fa, `${BASE}/reports/${f.reportB._id}`);
  assert.equal(cross.status, 404);

  const daOwn = await get(t.da, `${BASE}/reports/${f.reportA._id}`);
  assert.equal(daOwn.status, 200);
  const daCross = await get(t.da, `${BASE}/reports/${f.reportB._id}`);
  assert.equal(daCross.status, 404);
});

test('Issue 2b: student can only read their own report by ID', async () => {
  const t = tokens();
  const own = await get(t.student, `${BASE}/reports/${f.reportA._id}`);
  assert.equal(own.status, 200);
  const notMine = await get(t.student, `${BASE}/reports/${f.reportB._id}`);
  assert.equal(notMine.status, 404);
});

test('Issue 3: FacultyAdmin cannot create/update/toggle/delete department outside own faculty (DB-truth)', async () => {
  const t = tokens();
  const createBad = await get(t.fa, `${BASE}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Evil Dept', code: 'EVL', faculty: f.facultyB._id.toString(), isActive: true }),
  });
  assert.equal(createBad.status, 403);

  const updateCross = await get(t.fa, `${BASE}/departments/${f.deptB2._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Hacked Name' }),
  });
  assert.equal(updateCross.status, 403);

  const toggleCross = await get(t.fa, `${BASE}/departments/${f.deptB2._id}/toggle-status`, { method: 'PATCH' });
  assert.equal(toggleCross.status, 403);

  const deleteCross = await get(t.fa, `${BASE}/departments/${f.deptB2._id}`, { method: 'DELETE' });
  assert.equal(deleteCross.status, 403);

  const updateOwn = await get(t.fa, `${BASE}/departments/${f.deptA._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Renamed' }),
  });
  assert.equal(updateOwn.status, 200);

  const updated = await Department.findById(f.deptA._id);
  assert.equal(updated.description, 'Renamed');
});

test('Issue 3b: FacultyAdmin can create a department within own faculty', async () => {
  const t = tokens();
  const res = await get(t.fa, `${BASE}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Software Eng (Test)', code: 'SOE', faculty: f.facultyA._id.toString(), isActive: true }),
  });
  assert.equal(res.status, 201, await res.text());
});

test('Issue 4: valid status transitions succeed, invalid/backward transitions are rejected', async () => {
  const t = tokens();
  const toReview = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'under_review', currentStatus: 'pending', note: 'reviewing' }),
  });
  assert.equal(toReview.status, 200, await toReview.text());

  const invalidJump = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved', currentStatus: 'under_review', note: 'skip ahead' }),
  });
  assert.equal(invalidJump.status, 400);

  const after = await HazardReport.findById(f.reportA._id);
  assert.equal(after.status, 'under_review');
  assert.equal(after.statusHistory.length, 1, 'invalid transition must not add history');
  assert.ok(!after.resolvedAt, 'invalid transition must not set resolvedAt');

  const toProgress = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress', currentStatus: 'under_review', note: 'working on it' }),
  });
  assert.equal(toProgress.status, 200);

  const toResolved = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved', currentStatus: 'in_progress', note: 'done' }),
  });
  assert.equal(toResolved.status, 200);
  const resolved = await HazardReport.findById(f.reportA._id);
  assert.equal(resolved.status, 'resolved');
  assert.ok(resolved.resolvedAt, 'resolvedAt should be set');

  const backward = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'pending', currentStatus: 'resolved', note: 'reopen' }),
  });
  assert.equal(backward.status, 400);
  const afterBackward = await HazardReport.findById(f.reportA._id);
  assert.equal(afterBackward.status, 'resolved');
  assert.equal(afterBackward.statusHistory.length, 3);
});

test('Issue 4b: transition map is well-formed', () => {
  assert.deepEqual(Object.keys(VALID_STATUS_TRANSITIONS).sort(), ['in_progress', 'pending', 'resolved', 'under_review']);
  assert.deepEqual(VALID_STATUS_TRANSITIONS.pending, ['under_review']);
  assert.deepEqual(VALID_STATUS_TRANSITIONS.under_review, ['in_progress']);
  assert.deepEqual(VALID_STATUS_TRANSITIONS.in_progress, ['resolved']);
  assert.deepEqual(VALID_STATUS_TRANSITIONS.resolved, []);
});

test('Return: in_progress -> under_review requires a reason and is recorded as a return', async () => {
  const t = tokens();
  await setStatus(t.env1, f.reportA._id, 'under_review', 'pending');
  await setStatus(t.env1, f.reportA._id, 'in_progress', 'under_review');

  const missing = await setStatus(t.env1, f.reportA._id, 'under_review', 'in_progress');
  assert.equal(missing.status, 400, 'return without a reason must be rejected');

  const shortReason = await setStatus(t.env1, f.reportA._id, 'under_review', 'in_progress', { reason: 'nope' });
  assert.equal(shortReason.status, 400, 'reason below the minimum length must be rejected');

  let doc = await HazardReport.findById(f.reportA._id);
  assert.equal(doc.status, 'in_progress', 'rejected returns must not change status');

  const ok = await setStatus(t.env1, f.reportA._id, 'under_review', 'in_progress', { reason: 'Waste disposal was incomplete.' });
  assert.equal(ok.status, 200, await ok.text());

  doc = await HazardReport.findById(f.reportA._id);
  assert.equal(doc.status, 'under_review');
  const last = doc.statusHistory[doc.statusHistory.length - 1];
  assert.equal(last.isReturn, true, 'status history must flag the return');
  assert.equal(last.previousStatus, 'in_progress');
  assert.equal(last.note, 'Waste disposal was incomplete.');

  const audit = await AuditLog.findOne({ action: 'return_report', entityId: f.reportA._id });
  assert.ok(audit, 'return must be audited as return_report');
  assert.equal(audit.actorModel, 'EnvironmentalAdmin');
});

test('Reopen: resolved -> in_progress clears resolvedAt and is audited as reopen_report', async () => {
  const t = tokens();
  await setStatus(t.env1, f.reportA._id, 'under_review', 'pending');
  await setStatus(t.env1, f.reportA._id, 'in_progress', 'under_review');
  await setStatus(t.env1, f.reportA._id, 'resolved', 'in_progress');

  let doc = await HazardReport.findById(f.reportA._id);
  const firstResolvedAt = doc.resolvedAt;
  assert.ok(firstResolvedAt, 'resolvedAt should be set while resolved');

  const reopen = await setStatus(t.env1, f.reportA._id, 'in_progress', 'resolved', { reason: 'The flooding has returned after the storm.' });
  assert.equal(reopen.status, 200, await reopen.text());

  doc = await HazardReport.findById(f.reportA._id);
  assert.equal(doc.status, 'in_progress');
  assert.equal(doc.resolvedAt, null, 'resolvedAt must be cleared when leaving resolved');
  const last = doc.statusHistory[doc.statusHistory.length - 1];
  assert.equal(last.isReturn, true);
  assert.equal(last.previousStatus, 'resolved');

  const audit = await AuditLog.findOne({ action: 'reopen_report', entityId: f.reportA._id });
  assert.ok(audit, 'reopen must be audited as reopen_report');

  const reResolve = await setStatus(t.env1, f.reportA._id, 'resolved', 'in_progress');
  assert.equal(reResolve.status, 200, await reResolve.text());
  doc = await HazardReport.findById(f.reportA._id);
  assert.equal(doc.status, 'resolved');
  assert.ok(doc.resolvedAt, 're-resolving must set a new resolvedAt');
  assert.ok(new Date(doc.resolvedAt) >= new Date(firstResolvedAt), 'new resolution timestamp must not predate the previous one');
});

test('Reopen: resolved -> under_review is allowed with a reason', async () => {
  const t = tokens();
  await setStatus(t.env1, f.reportA._id, 'under_review', 'pending');
  await setStatus(t.env1, f.reportA._id, 'in_progress', 'under_review');
  await setStatus(t.env1, f.reportA._id, 'resolved', 'in_progress');

  const res = await setStatus(t.env1, f.reportA._id, 'under_review', 'resolved', { reason: 'Needs a second review after complaints.' });
  assert.equal(res.status, 200, await res.text());
  const doc = await HazardReport.findById(f.reportA._id);
  assert.equal(doc.status, 'under_review');
  assert.equal(doc.resolvedAt, null);
});

test('Concurrency: a stale currentStatus returns 409 without changing the report', async () => {
  const t = tokens();
  const res = await setStatus(t.env1, f.reportA._id, 'under_review', 'resolved');
  assert.equal(res.status, 409, 'stale client status must be rejected with 409');
  const doc = await HazardReport.findById(f.reportA._id);
  assert.equal(doc.status, 'pending');
  assert.equal(doc.statusHistory.length, 0);
});

test('Authorization: FacultyAdmin cannot update or return report status (403)', async () => {
  const t = tokens();
  const res = await setStatus(t.fa, f.reportA._id, 'under_review', 'pending', { reason: 'Trying to bypass RBAC.' });
  assert.equal(res.status, 403);
  const studentRes = await setStatus(t.student, f.reportA._id, 'under_review', 'pending');
  assert.equal(studentRes.status, 403, 'students cannot update report status');
  const doc = await HazardReport.findById(f.reportA._id);
  assert.equal(doc.status, 'pending');
});

test('Return notifies the reporter exactly once and includes the reason', async () => {
  const t = tokens();
  await setStatus(t.env1, f.reportA._id, 'under_review', 'pending');
  await setStatus(t.env1, f.reportA._id, 'in_progress', 'under_review');
  await setStatus(t.env1, f.reportA._id, 'under_review', 'in_progress', { reason: 'Visible return reason.' });

  const notifs = await Notification.find({ recipient: f.studentAccount._id, type: 'report_status_changed' });
  const returns = notifs.filter((n) => n.metadata && n.metadata.isReturn);
  assert.equal(returns.length, 1, 'exactly one return notification');
  assert.ok((returns[0].message || '').includes('Visible return reason.'));
  assert.equal(returns[0].recipientModel, 'StudentAccount');
});

test('Student can see the return reason in the report history', async () => {
  const t = tokens();
  await setStatus(t.env1, f.reportA._id, 'under_review', 'pending');
  await setStatus(t.env1, f.reportA._id, 'in_progress', 'under_review');
  await setStatus(t.env1, f.reportA._id, 'under_review', 'in_progress', { reason: 'Please add more site photos.' });

  const res = await get(t.student, `${BASE}/reports/${f.reportA._id}`);
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  const history = body.data.statusHistory;
  const last = history[history.length - 1];
  assert.equal(last.isReturn, true);
  assert.equal(last.previousStatus, 'in_progress');
  assert.equal(last.note, 'Please add more site photos.');
});

test('Issue 6: audit log identifies real actor for faculty deletion by EnvironmentalAdmin', async () => {
  const t = tokens();
  const res = await get(t.env1, `${BASE}/faculties/${f.facultyB._id}`, { method: 'DELETE' });
  assert.equal(res.status, 200, await res.text());

  const log = await AuditLog.findOne({ action: 'delete_faculty', entityType: 'Faculty' });
  assert.ok(log, 'delete_faculty audit log should exist');
  assert.equal(log.actor.toString(), f.env1._id.toString());
  assert.equal(log.actorModel, 'EnvironmentalAdmin');
  assert.ok(log.actorName, 'actorName should be populated');
});

test('Issue 6b: audit log identifies real actor for department deletion by EnvironmentalAdmin', async () => {
  const t = tokens();
  const res = await get(t.env1, `${BASE}/departments/${f.deptA._id}`, { method: 'DELETE' });
  assert.equal(res.status, 200, await res.text());

  const log = await AuditLog.findOne({ action: 'delete_department', entityType: 'Department' });
  assert.ok(log, 'delete_department audit log should exist');
  assert.equal(log.actor.toString(), f.env1._id.toString());
  assert.equal(log.actorModel, 'EnvironmentalAdmin');
  assert.ok(log.actorName, 'actorName should be populated');
});

test('Issue 6c: department create/update/toggle by FacultyAdmin records FacultyAdmin as actor', async () => {
  const t = tokens();
  const create = await get(t.fa, `${BASE}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Cyber Security (Test)', code: 'CYS', faculty: f.facultyA._id.toString(), isActive: true }),
  });
  assert.equal(create.status, 201);
  const created = await Department.findOne({ code: 'CYS' });
  const logCreate = await AuditLog.findOne({ action: 'create_department', entityType: 'Department', entityId: created._id, faculty: f.facultyA._id });
  assert.ok(logCreate);
  assert.equal(logCreate.actorModel, 'FacultyAdmin');
  assert.equal(logCreate.actor.toString(), f.faA._id.toString());
  assert.equal(logCreate.faculty.toString(), f.facultyA._id.toString());

  const update = await get(t.fa, `${BASE}/departments/${created._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Updated desc' }),
  });
  assert.equal(update.status, 200);
  const logUpdate = await AuditLog.findOne({ action: 'update_department', entityType: 'Department', entityId: created._id, faculty: f.facultyA._id });
  assert.ok(logUpdate);
  assert.equal(logUpdate.actorModel, 'FacultyAdmin');
  assert.equal(logUpdate.actor.toString(), f.faA._id.toString());
});

test('Issue 7: audit logs endpoint — EnvAdmin 200, FacultyAdmin 200 scoped, DeptAdmin 403, unauth denied', async () => {
  const t = tokens();
  const env = await get(t.env1, `${BASE}/audit-logs`);
  assert.equal(env.status, 200, await env.text());

  const fa = await get(t.fa, `${BASE}/audit-logs`);
  assert.equal(fa.status, 200);
  const faBody = await fa.json();
  for (const log of faBody.data) {
    if (log.faculty) {
      assert.equal(log.faculty.toString(), f.facultyA._id.toString());
    }
  }

  const da = await get(t.da, `${BASE}/audit-logs`);
  assert.equal(da.status, 403);

  const anon = await get(null, `${BASE}/audit-logs`);
  assert.equal(anon.status, 401);
});

test('Issue 7b: malformed audit filters do not produce 500', async () => {
  const t = tokens();
  const bad = await get(t.env1, `${BASE}/audit-logs?dateFrom=not-a-date&dateTo=also-bad&page=abc&limit=999999&search=[`);
  assert.ok([200, 400].includes(bad.status), `expected 200/400, got ${bad.status}`);
  const good = await get(t.env1, `${BASE}/audit-logs?page=1&limit=5`);
  assert.equal(good.status, 200);
});

test('Regression T31: report submission creates audit log entry', async () => {
  const t = tokens();
  const res = await get(t.student, `${BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Blocked drainage in hostel',
      description: 'Standing water and mosquitoes.',
      category: 'Blocked Drainage',
      address: 'Hostel B drainage',
      latitude: 3.41,
      longitude: 6.51,
    }),
  });
  assert.equal(res.status, 201, await res.text());
  const log = await waitFor(() => AuditLog.findOne({ action: 'create', entityType: 'HazardReport' }));
  assert.ok(log, 'create audit log should exist');
});

test('Regression T27: report submission notifies faculty admin and env admins (report_submitted)', async () => {
  const t = tokens();
  await get(t.student, `${BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Pollution near cafeteria',
      description: 'Smoke and smell.',
      category: 'Pollution',
      address: 'Cafeteria',
      latitude: 3.42,
      longitude: 6.52,
    }),
  });
  const sent = await waitFor(() => Notification.find({ type: 'report_submitted' }).then((docs) => (docs.length ? docs : null)));
  assert.ok(sent && sent.length >= 1, 'submission notifications should exist');
  const models = new Set(sent.map((n) => n.recipientModel));
  assert.ok(models.has('FacultyAdmin'), 'faculty admin should be notified');
  assert.ok(models.has('EnvironmentalAdmin'), 'env admin should be notified');
});

test('Regression T28: status update notifies reporter (report_status_changed)', async () => {
  const t = tokens();
  await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'under_review', currentStatus: 'pending', note: 'reviewing' }),
  });
  const notif = await waitFor(() => Notification.findOne({ type: 'report_status_changed', recipient: f.studentAccount._id }));
  assert.ok(notif, 'reporter should be notified of status change');
  assert.equal(notif.recipientModel, 'StudentAccount');
});

test('Regression S04/S05: FacultyAdmin restricted to own faculty for students; dept admin cannot view audit logs', async () => {
  const t = tokens();
  const other = await Student.create({
    registrationNumber: '20998880000',
    fullName: 'Other Faculty Student',
    email: 'other@test.com',
    department: 'Computer Science (Test)',
    faculty: f.facultyB._id,
    level: '300',
  });
  const list = await get(t.fa, `${BASE}/students`);
  assert.equal(list.status, 200);
  const body = await list.json();
  const ids = body.data.map((s) => s._id.toString());
  assert.ok(ids.includes(f.student._id.toString()));
  assert.ok(!ids.includes(other._id.toString()));

  const direct = await get(t.fa, `${BASE}/students/${other._id}`);
  assert.equal(direct.status, 404);

  const daAudit = await get(t.da, `${BASE}/audit-logs`);
  assert.equal(daAudit.status, 403);
});

test('Regression T25: env admin can create another env admin (root provisioning)', async () => {
  const t = tokens();
  const res = await get(t.env1, `${BASE}/environmental-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Env Three', email: 'env3@test.com', password: 'password1' }),
  });
  assert.equal(res.status, 201, await res.text());
  const created = await EnvironmentalAdmin.findOne({ email: 'env3@test.com' });
  assert.ok(created);
  assert.equal(created.isActive, true);
});

test('Regression T32/Issue 7: System-actor audit records and actorName lookup do not crash list', async () => {
  await AuditLog.create({
    actor: null,
    actorModel: 'System',
    action: 'system_seed',
    entityType: 'System',
    description: 'System seed record',
    faculty: null,
  });
  const t = tokens();
  const res = await get(t.env1, `${BASE}/audit-logs`);
  assert.equal(res.status, 200, 'audit logs should load');
  const body = await res.json();
  assert.ok(body.success, 'response should be successful');
  assert.ok(Array.isArray(body.data), 'data should be an array');
  assert.ok(body.data.some((log) => log.actorModel === 'System'), 'System-actor log should be listed');
});

test('Regression C-series: token claims for deactivated admin denied', async () => {
  const t = tokens();
  await EnvironmentalAdmin.findByIdAndUpdate(f.env1._id, { isActive: false });
  const res = await get(t.env1, `${BASE}/reports`);
  assert.equal(res.status, 401);
});

test('Regression PV-L2: ?faculty= query cannot override facultyAdmin/departmentAdmin scope', async () => {
  const t = tokens();
  const faScoped = await get(t.fa, `${BASE}/reports?page=1&limit=20&faculty=${f.facultyB._id}`);
  assert.equal(faScoped.status, 200);
  const faIds = (await faScoped.json()).data.map((r) => r._id.toString());
  assert.ok(faIds.includes(f.reportA._id.toString()), 'own-faculty report must be returned');
  assert.ok(!faIds.includes(f.reportB._id.toString()), 'foreign-faculty report must NOT be returned');

  const daScoped = await get(t.da, `${BASE}/reports?page=1&limit=20&faculty=${f.facultyB._id}`);
  assert.equal(daScoped.status, 200);
  const daIds = (await daScoped.json()).data.map((r) => r._id.toString());
  assert.ok(daIds.includes(f.reportA._id.toString()), 'department admin own-faculty report must be returned');
  assert.ok(!daIds.includes(f.reportB._id.toString()), 'department admin foreign report must NOT be returned');
});

test('Regression PV-L2b: envAdmin may still filter reports by faculty', async () => {
  const t = tokens();
  const filtered = await get(t.env1, `${BASE}/reports?page=1&limit=20&faculty=${f.facultyB._id}`);
  assert.equal(filtered.status, 200);
  const ids = (await filtered.json()).data.map((r) => r._id.toString());
  assert.ok(ids.includes(f.reportB._id.toString()), 'target-faculty report should be returned');
  assert.ok(!ids.includes(f.reportA._id.toString()), 'other-faculty report should be excluded');
});

test('Regression PV-A1: delete_report audit log records the real EnvironmentalAdmin', async () => {
  const t = tokens();
  const res = await get(t.env1, `${BASE}/reports/${f.reportB._id}`, { method: 'DELETE' });
  assert.equal(res.status, 200, await res.text());

  const log = await waitFor(() =>
    AuditLog.findOne({ action: 'delete_report', entityType: 'Report', entityId: f.reportB._id })
  );
  assert.ok(log, 'delete_report audit log should exist');
  assert.equal(log.actor.toString(), f.env1._id.toString());
  assert.equal(log.actorModel, 'EnvironmentalAdmin');
  assert.ok(log.actorName, 'actorName should be populated');
  assert.equal(log.actorName, 'Env Admin One');
});

test('Regression PV-A2: batch create + delete student audit logs record the DepartmentAdmin', async () => {
  const t = tokens();
  const batch = await get(t.da, `${BASE}/students/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      students: [
        { registrationNumber: '30000000001', fullName: 'Batch Imported Student', email: 'batch@test.com', department: 'IFT', level: '200' },
      ],
    }),
  });
  assert.equal(batch.status, 200, await batch.text());

  const created = await Student.findOne({ registrationNumber: '30000000001' });
  assert.ok(created, 'batch-created student should exist');

  const logBatch = await waitFor(() => AuditLog.findOne({ action: 'batch_create_students', entityType: 'Student' }));
  assert.ok(logBatch, 'batch_create_students audit log should exist');
  assert.equal(logBatch.actor.toString(), f.daA._id.toString());
  assert.equal(logBatch.actorModel, 'DepartmentAdmin');
  assert.ok(logBatch.actorName, 'actorName should be populated');

  const del = await get(t.da, `${BASE}/students/${created._id}`, { method: 'DELETE' });
  assert.equal(del.status, 200, await del.text());

  const logDel = await waitFor(() =>
    AuditLog.findOne({ action: 'delete_student', entityType: 'Student', entityId: created._id })
  );
  assert.ok(logDel, 'delete_student audit log should exist');
  assert.equal(logDel.actor.toString(), f.daA._id.toString());
  assert.equal(logDel.actorModel, 'DepartmentAdmin');
  assert.ok(logDel.actorName, 'actorName should be populated');
  assert.equal(logDel.actorName, 'Dept Admin A');
});

test('Regression PV-A3: import_students audit log records the DepartmentAdmin (multipart CSV)', async () => {
  const t = tokens();
  const csv = 'registrationNumber,fullName,email,level\n30000000002,Imported Student Two,imported2@test.com,300\n';
  const fd = new FormData();
  fd.append('file', new Blob([csv], { type: 'text/csv' }), 'students.csv');

  const res = await get(t.da, `${BASE}/students/import`, { method: 'POST', body: fd });
  assert.equal(res.status, 200, await res.text());

  const log = await waitFor(() => AuditLog.findOne({ action: 'import_students', entityType: 'Student' }));
  assert.ok(log, 'import_students audit log should exist');
  assert.equal(log.actor.toString(), f.daA._id.toString());
  assert.equal(log.actorModel, 'DepartmentAdmin');
  assert.ok(log.actorName, 'actorName should be populated');

  const created = await Student.findOne({ registrationNumber: '30000000002' });
  assert.ok(created, 'imported student should exist');
});

const patchStudent = (token, studentId, body) =>
  get(token, `${BASE}/students/${studentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('Regression SE-1: FacultyAdmin can edit fields for own-faculty students only', async () => {
  const t = tokens();

  const res = await patchStudent(t.fa, f.student._id, {
    fullName: 'Renamed Student',
    email: 'renamed@test.com',
    level: '500',
    isEligible: false,
  });
  assert.equal(res.status, 200, await res.text());

  const updated = await Student.findById(f.student._id);
  assert.equal(updated.fullName, 'Renamed Student');
  assert.equal(updated.email, 'renamed@test.com');
  assert.equal(updated.level, '500');
  assert.equal(updated.isEligible, false);

  const foreign = await patchStudent(t.fa, f.student2._id, { fullName: 'Hacked' });
  assert.equal(foreign.status, 404, 'faculty admin must not edit other-faculty students');
  const untouched = await Student.findById(f.student2._id);
  assert.equal(untouched.fullName, 'Second Student');
});

test('Regression SE-2: FacultyAdmin may change department within own faculty only', async () => {
  const t = tokens();

  const ok = await patchStudent(t.fa, f.student._id, { department: 'ift' });
  assert.equal(ok.status, 200, await ok.text());
  let updated = await Student.findById(f.student._id);
  assert.equal(updated.department, 'IFT');

  const bad = await patchStudent(t.fa, f.student._id, { department: 'CSC-DEPT' });
  assert.equal(bad.status, 400, 'department outside own faculty must be rejected');
  updated = await Student.findById(f.student._id);
  assert.equal(updated.department, 'IFT');
});

test('Regression SE-3: DepartmentAdmin edit is department-scoped; faculty/department are not mass-assignable', async () => {
  const t = tokens();
  const own = await Student.create({
    registrationNumber: '20998880099',
    fullName: 'Dept Scoped Student',
    email: 'deptscoped@test.com',
    department: 'IFT',
    faculty: f.facultyA._id,
    level: '200',
  });

  const res = await patchStudent(t.da, own._id, {
    fullName: 'Dept Renamed',
    isEligible: false,
    faculty: f.facultyB._id.toString(),
    department: 'CSC-DEPT',
  });
  assert.equal(res.status, 200, await res.text());

  const updated = await Student.findById(own._id);
  assert.equal(updated.fullName, 'Dept Renamed');
  assert.equal(updated.isEligible, false);
  assert.equal(updated.faculty.toString(), f.facultyA._id.toString(), 'faculty must not be reassignable');
  assert.equal(updated.department, 'IFT', 'department must not be changeable by a department admin');

  const foreign = await Student.create({
    registrationNumber: '20998880077',
    fullName: 'Other Dept Student',
    email: 'otherdept@test.com',
    department: 'CSC-DEPT',
    faculty: f.facultyA._id,
    level: '100',
  });
  const denied = await patchStudent(t.da, foreign._id, { fullName: 'Nope' });
  assert.equal(denied.status, 404, 'department admin must not edit out-of-department students');
});

test('Regression SE-4: duplicate email is rejected on student update', async () => {
  const t = tokens();
  const res = await patchStudent(t.fa, f.student._id, { email: 'student2@test.com' });
  assert.equal(res.status, 409);
});

test('Regression SE-5: student update audit log records the real FacultyAdmin actor', async () => {
  const t = tokens();
  const res = await patchStudent(t.fa, f.student._id, { fullName: 'Audited Student' });
  assert.equal(res.status, 200, await res.text());

  const log = await waitFor(() =>
    AuditLog.findOne({ action: 'update', entityType: 'Student', entityId: f.student._id })
  );
  assert.ok(log, 'update_student audit log should exist');
  assert.equal(log.actor.toString(), f.faA._id.toString());
  assert.equal(log.actorModel, 'FacultyAdmin');
  assert.ok(log.actorName, 'actorName should be populated');
});

test('Regression SE-6: students and environmental admins cannot edit students', async () => {
  const t = tokens();
  const studentRes = await patchStudent(t.student, f.student._id, { fullName: 'Hacked' });
  assert.equal(studentRes.status, 403);

  const envRes = await patchStudent(t.env1, f.student._id, { fullName: 'Hacked' });
  assert.equal(envRes.status, 403);
});

// ── Reverse geocoding (location.placeName) ────────────────────────────────

test('GEO-1: report creation succeeds and stores no place name when geocoding is disabled', async () => {
  const t = tokens();
  process.env.GEOCODE_ENABLED = 'false';
  const res = await postReport(t.student, sampleReportBody());
  const body = await res.json();
  assert.equal(res.status, 201, JSON.stringify(body));

  const created = await HazardReport.findById(body.data._id);
  assert.equal(created.location.placeName, undefined, 'no placeName without geocoding');
});

test('GEO-2: reverse geocoding populates and persists location.placeName', async () => {
  const t = tokens();
  process.env.GEOCODE_ENABLED = 'true';
  try {
    const res = await postReport(t.student, sampleReportBody());
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));

    const filled = await waitFor(async () => {
      const doc = await HazardReport.findById(body.data._id);
      return doc.location.placeName ? doc : null;
    }, 6000);
    assert.ok(filled, 'placeName should be backfilled asynchronously');
    assert.match(filled.location.placeName, /Ihiagwa|Owerri|Nigeria/);
  } finally {
    process.env.GEOCODE_ENABLED = 'false';
  }
});

test('GEO-3: reading a legacy report lazily backfills and returns placeName', async () => {
  const t = tokens();
  process.env.GEOCODE_ENABLED = 'true';
  try {
    assert.ok(!f.reportA.location.placeName, 'seeded report starts without a placeName');

    const res = await get(t.student, `${BASE}/reports/${f.reportA._id}`);
    const resBody = await res.json();
    assert.equal(res.status, 200, JSON.stringify(resBody));

    const persisted = await waitFor(async () => {
      const doc = await HazardReport.findById(f.reportA._id);
      return doc.location.placeName ? doc : null;
    }, 6000);
    assert.ok(persisted, 'placeName should be persisted after the read');

    // A subsequent read is served from the stored value.
    const again = await get(t.student, `${BASE}/reports/${f.reportA._id}`);
    const againBody = await again.json();
    assert.equal(againBody.data.location.placeName, persisted.location.placeName);
  } finally {
    process.env.GEOCODE_ENABLED = 'false';
  }
});

test('GEO-4: a failing geocoder never blocks report creation', async () => {
  const t = tokens();
  const previous = nominatimResponder;
  nominatimResponder = (req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'boom' }));
  };
  process.env.GEOCODE_ENABLED = 'true';
  try {
    const res = await postReport(t.student, sampleReportBody());
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));

    await new Promise((resolve) => setTimeout(resolve, 1300));
    const doc = await HazardReport.findById(body.data._id);
    assert.equal(doc.location.placeName, undefined, 'no placeName on failure');
  } finally {
    nominatimResponder = previous;
    process.env.GEOCODE_ENABLED = 'false';
  }
});

test('GEO-5: editing coordinates clears the stale place name and refills it', async () => {
  const t = tokens();
  process.env.GEOCODE_ENABLED = 'true';
  try {
    const res = await postReport(t.student, sampleReportBody());
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));

    const first = await waitFor(async () => {
      const doc = await HazardReport.findById(body.data._id);
      return doc.location.placeName ? doc : null;
    }, 6000);
    assert.ok(first, 'initial placeName should be filled');

    const edit = await get(t.student, `${BASE}/reports/${body.data._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: 6.5, longitude: 3.4 }),
    });
    const editBody = await edit.json();
    assert.equal(edit.status, 200, JSON.stringify(editBody));

    const refilled = await waitFor(async () => {
      const doc = await HazardReport.findById(body.data._id);
      return doc.location.placeName ? doc : null;
    }, 6000);
    assert.ok(refilled, 'placeName should be refilled after moving coordinates');
    assert.deepEqual(Array.from(refilled.location.coordinates), [3.4, 6.5]);
  } finally {
    process.env.GEOCODE_ENABLED = 'false';
  }
});

test('GEO-6: CSP allows the map tile hosts used by the report detail view', async () => {
  const res = await get(null, '/health');
  assert.equal(res.status, 200);

  const csp = res.headers.get('content-security-policy');
  assert.ok(csp, 'helmet should emit a content-security-policy header');
  assert.match(csp, /img-src[^;]*tile\.openstreetmap\.org/);
  assert.match(csp, /img-src[^;]*services\.arcgisonline\.com/);
});