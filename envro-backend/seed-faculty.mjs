import mongoose from 'mongoose';

const stuSchema = new mongoose.Schema({
  registrationNumber: String, fullName: String, email: String,
  department: String, faculty: mongoose.Schema.Types.ObjectId, level: String,
}, { collection: 'students' });

const Student = mongoose.model('Student', stuSchema);

await mongoose.connect('mongodb://localhost:27017/envroguard-db');

const result = await Student.updateOne(
  { registrationNumber: 'STU2024001' },
  { $set: { faculty: new mongoose.Types.ObjectId('6a49362921f36f52ada14fec') } }
);
console.log('Updated:', result.modifiedCount);

await mongoose.disconnect();
