const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/envroguard-db');

  const facSchema = new mongoose.Schema({ name: String, code: String, isActive: Boolean }, { collection: 'faculties' });
  const stuSchema = new mongoose.Schema({
    registrationNumber: String, fullName: String, email: String,
    department: String, faculty: mongoose.Schema.Types.ObjectId, level: String,
  }, { collection: 'students' });

  const Faculty = mongoose.model('Faculty', facSchema);
  const Student = mongoose.model('Student', stuSchema);

  let fac = await Faculty.findOne({});
  if (!fac) {
    fac = await Faculty.create({ name: 'Engineering', code: 'ENG', isActive: true });
    console.log('Created faculty:', fac._id);
  } else {
    console.log('Existing faculty:', fac._id);
  }

  const result = await Student.updateMany(
    { $or: [{ faculty: { $exists: false } }, { faculty: null }] },
    { $set: { faculty: fac._id } }
  );
  console.log('Updated students:', result.modifiedCount);

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
