import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Faculty name is required'],
      trim: true,
      unique: true,
      maxlength: [200, 'Faculty name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      maxlength: [50, 'Faculty code cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

facultySchema.index({ name: 'text', code: 'text' });

export const Faculty = mongoose.model('Faculty', facultySchema);
