import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { config } from '../src/config/index.js';
import { Faculty } from '../src/modules/faculty/model.js';
import { Student } from '../src/modules/student/model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = path.join(__dirname, '..', 'IFT 500L Class List.xlsx');
const IMPORT_FILE = path.join(__dirname, '..', 'IFT 500L Import File.xlsx');

const BASE_EMAILS = [
  'favouruche060@gmail.com',
  'princeogram@gmail.com',
  'boltgoodlife2@gmail.com',
  'boltgoodlife3@gmail.com',
  'boltgoodlife4@gmail.com',
  'boltgoodlife5@gmail.com',
];

const DEPARTMENT = 'IFT';
const LEVEL = '500';
const TARGET_URI = process.env.TARGET_URI || 'mongodb://localhost:27017/envro-guard-debug';

const buildEmail = (fullName, registrationNumber, base, used) => {
  const local = base.split('@')[0];
  const domain = base.split('@')[1];
  let tag = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let email = `${local}+${tag}@${domain}`;
  if (used.has(email)) {
    email = `${local}+${tag}${registrationNumber}@${domain}`;
  }
  if (used.has(email)) {
    throw new Error(`Could not build a unique email for ${registrationNumber} ${fullName}`);
  }
  used.add(email);
  return email;
};

const readClassList = () => {
  const workbook = XLSX.read(fs.readFileSync(SOURCE_FILE), { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows
    .filter((row) => typeof row.__EMPTY === 'number' && row.__EMPTY_1 && row.__EMPTY_2)
    .map((row) => ({
      sn: row.__EMPTY,
      fullName: String(row.__EMPTY_1).trim().replace(/\s+/g, ' '),
      registrationNumber: String(row.__EMPTY_2).trim(),
    }));
};

const writeImportFile = (students) => {
  const rows = students.map((s) => ({
    registrationNumber: s.registrationNumber,
    fullName: s.fullName,
    email: s.email,
    department: DEPARTMENT,
    level: LEVEL,
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'IFT 500L');
  XLSX.writeFile(workbook, IMPORT_FILE);
};

const importToDb = async (students) => {
  await mongoose.connect(TARGET_URI);

  const faculty = await Faculty.findOne({ code: 'SICT' });
  if (!faculty) {
    throw new Error('Faculty SICT not found in target database');
  }

  let created = 0;
  let updated = 0;

  for (const s of students) {
    const res = await Student.updateOne(
      { registrationNumber: s.registrationNumber },
      {
        $set: {
          fullName: s.fullName,
          email: s.email.toLowerCase(),
          department: DEPARTMENT,
          faculty: faculty._id,
          level: LEVEL,
          isEligible: true,
        },
      },
      { upsert: true, runValidators: true }
    );
    if (res.upsertedCount > 0) created++;
    else updated++;
  }

  const total = await Student.countDocuments({ department: DEPARTMENT, level: LEVEL });
  await mongoose.disconnect();
  return { created, updated, total };
};

const run = async () => {
  const classList = readClassList();

  const invalid = classList.filter((s) => !/^\d{11}$/.test(s.registrationNumber));
  if (invalid.length > 0) {
    console.error('Invalid registration numbers:', invalid);
    process.exit(1);
  }

  const used = new Set();
  const students = classList.map((s, i) => ({
    ...s,
    email: buildEmail(s.fullName, s.registrationNumber, BASE_EMAILS[i % BASE_EMAILS.length], used),
  }));

  writeImportFile(students);

  console.log(`Parsed ${students.length} students from class list`);
  console.log(`Import file written: ${IMPORT_FILE}`);
  console.log('');

  const counts = {};
  for (const s of students) {
    const base = s.email.split('+')[0] + '@gmail.com';
    counts[base] = (counts[base] || 0) + 1;
  }
  for (const base of BASE_EMAILS) {
    console.log(`  ${base}: ${counts[base] || 0} students`);
  }
  console.log('');

  if (process.env.DRY_RUN === '1') {
    console.log('DRY_RUN=1 — skipping database import');
    console.log('First 5:');
    for (const s of students.slice(0, 5)) {
      console.log(`  ${s.registrationNumber}  ${s.fullName}  ${s.email}`);
    }
    return;
  }

  const { total } = await importToDb(students);
  console.log(`Database import complete (${TARGET_URI})`);
  console.log(`IFT ${LEVEL}L students in database: ${total}`);
  console.log('');
  console.log('First 5 assigned emails:');
  for (const s of students.slice(0, 5)) {
    console.log(`  ${s.registrationNumber}  ${s.fullName}  ${s.email}`);
  }
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
