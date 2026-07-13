import mongoose from 'mongoose';
import { config } from './src/config/index.js';
import { Faculty } from './src/modules/faculty/model.js';
import { Student } from './src/modules/student/model.js';

async function run() {
  const [regNumber, fullName, email, dept, level, facultyId] = process.argv.slice(2);

  if (!regNumber || !facultyId) {
    console.log('Usage: node create-student.mjs <regNumber> <fullName> <email> <dept> <level> <facultyId>');
    process.exit(1);
  }

  await mongoose.connect(config.mongo.uri);

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    console.error('Faculty not found:', facultyId);
    process.exit(1);
  }

  const existing = await Student.findOne({ registrationNumber: regNumber });
  if (existing) {
    console.log('Already exists:', existing.registrationNumber);
    process.exit(0);
  }

  const student = await Student.create({
    registrationNumber: regNumber.toUpperCase(),
    fullName,
    email: email.toLowerCase(),
    department: dept,
    faculty: faculty._id,
    level,
  });

  console.log('Created:', student.registrationNumber, '-', student.email);
  process.exit(0);
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
