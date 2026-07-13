import mongoose from 'mongoose';

const deviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      required: true,
      enum: ['StudentAccount', 'DepartmentAdmin', 'FacultyAdmin', 'EnvironmentalAdmin'],
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'android',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ user: 1, isActive: 1 });

export const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);
