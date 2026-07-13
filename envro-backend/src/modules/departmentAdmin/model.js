import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLES } from '../../constants/roles.js';

const departmentAdminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: [ROLES.DEPARTMENT_ADMIN],
      default: ROLES.DEPARTMENT_ADMIN,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty assignment is required'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultyAdmin',
    },
  },
  { timestamps: true }
);

departmentAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

departmentAdminSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

departmentAdminSchema.index({ faculty: 1, department: 1 });
departmentAdminSchema.index({ department: 1, isActive: 1 });

export const DepartmentAdmin = mongoose.model(
  'DepartmentAdmin',
  departmentAdminSchema
);
