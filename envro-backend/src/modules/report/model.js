import mongoose from 'mongoose';
import { REPORT_STATUS, REPORT_PRIORITY, HAZARD_CATEGORIES, TIMELINE_EVENT_TYPES } from '../../constants/hazard.js';

const hazardReportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Hazard category is required'],
      enum: HAZARD_CATEGORIES,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number] },
      address: { type: String, required: true, trim: true },
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentAccount',
      required: true,
      index: true,
    },
    studentInfo: {
      registrationNumber: { type: String, required: true },
      fullName: { type: String },
      faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
      department: { type: String },
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(REPORT_PRIORITY),
      default: REPORT_PRIORITY.MEDIUM,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EnvironmentalAdmin',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'statusHistory.changedByModel',
        },
        changedByModel: {
          type: String,
          enum: ['EnvironmentalAdmin'],
        },
        note: { type: String, trim: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: {
      type: Date,
    },
    timeline: [
      {
        eventType: {
          type: String,
          required: true,
          enum: Object.values(TIMELINE_EVENT_TYPES),
        },
        description: { type: String, required: true, trim: true },
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'timeline.actorModel',
        },
        actorModel: {
          type: String,
          enum: ['StudentAccount', 'DepartmentAdmin', 'FacultyAdmin', 'EnvironmentalAdmin'],
        },
        actorName: { type: String, default: '' },
        metadata: { type: mongoose.Schema.Types.Mixed },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

hazardReportSchema.index({ createdAt: -1 });
hazardReportSchema.index({ faculty: 1, status: 1 });
hazardReportSchema.index({ category: 1 });
hazardReportSchema.index({ 'studentInfo.registrationNumber': 1 });
hazardReportSchema.index({ 'location.coordinates': '2dsphere' });

hazardReportSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === REPORT_STATUS.RESOLVED) {
    this.resolvedAt = new Date();
  }
  next();
});

export const HazardReport = mongoose.model('HazardReport', hazardReportSchema);
