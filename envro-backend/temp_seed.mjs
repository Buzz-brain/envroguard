import mongoose from 'mongoose';
import { config } from './src/config/index.js';
import { Student } from './src/modules/student/model.js';

async function run() {
  await mongoose.connect(config.mongo.uri);
  const student = await Student.create({
    registrationNumber: 'STU2024001',
    fullName: 'Test Student',
    email: 'chinomsochristian03@gmail.com',
    department: 'Computer Science',
    faculty: '6a42bc5976796d929a3d9f82',
    level: '300',
  });
  console.log('Student created:', student.registrationNumber, '-', student.email);
  process.exit(0);
}
run();
