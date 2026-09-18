process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/envro-guard-test';
process.env.RATE_LIMIT_WINDOW_MS = '600000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
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
    body: JSON.stringify({ status: 'under_review', note: 'reviewing' }),
  });
  assert.equal(toReview.status, 200, await toReview.text());

  const invalidJump = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved', note: 'skip ahead' }),
  });
  assert.equal(invalidJump.status, 400);

  const after = await HazardReport.findById(f.reportA._id);
  assert.equal(after.status, 'under_review');
  assert.equal(after.statusHistory.length, 1, 'invalid transition must not add history');
  assert.ok(!after.resolvedAt, 'invalid transition must not set resolvedAt');

  const toProgress = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress', note: 'working on it' }),
  });
  assert.equal(toProgress.status, 200);

  const toResolved = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved', note: 'done' }),
  });
  assert.equal(toResolved.status, 200);
  const resolved = await HazardReport.findById(f.reportA._id);
  assert.equal(resolved.status, 'resolved');
  assert.ok(resolved.resolvedAt, 'resolvedAt should be set');

  const backward = await get(t.env1, `${BASE}/reports/${f.reportA._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'pending', note: 'reopen' }),
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
    body: JSON.stringify({ status: 'under_review', note: 'reviewing' }),
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