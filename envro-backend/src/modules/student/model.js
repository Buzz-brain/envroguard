import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      trim: true,
      unique: true,
      uppercase: true,
      match: [/^\d{11}$/, 'Registration number must be exactly 11 digits'],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [150, 'Full name cannot exceed 150 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty reference is required'],
    },
    level: {
      type: String,
      required: [true, 'Level is required'],
      trim: true,
    },
    isEligible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

studentSchema.index({ registrationNumber: 1, email: 1 });
studentSchema.index({ faculty: 1, department: 1 });

export const Student = mongoose.model('Student', studentSchema);
