import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLES } from '../../constants/roles.js';

const environmentalAdminSchema = new mongoose.Schema(
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
      enum: [ROLES.ENVIRONMENTAL_ADMIN],
      default: ROLES.ENVIRONMENTAL_ADMIN,
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
      ref: 'EnvironmentalAdmin',
    },
  },
  { timestamps: true }
);

environmentalAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

environmentalAdminSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

environmentalAdminSchema.index({ isActive: 1 });

export const EnvironmentalAdmin = mongoose.model('EnvironmentalAdmin', environmentalAdminSchema);
