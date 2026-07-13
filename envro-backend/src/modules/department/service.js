import { Department } from './model.js';
import { Faculty } from '../faculty/model.js';
import { ApiError } from '../../utils/apiError.js';

export const createDepartmentService = async (data, createdBy) => {
  const faculty = await Faculty.findById(data.faculty);
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  const existing = await Department.findOne({
    code: data.code.toUpperCase(),
    faculty: data.faculty,
  });
  if (existing) {
    throw new ApiError(409, 'Department with this code already exists in this faculty');
  }

  const department = await Department.create({
    ...data,
    code: data.code.toUpperCase(),
    createdBy,
  });

  return department;
};

export const getAllDepartmentsService = async (filters = {}) => {
  const query = {};

  if (filters.faculty) query.faculty = filters.faculty;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { code: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const departments = await Department.find(query)
    .populate('faculty', 'name code')
    .sort({ name: 1 });

  return departments;
};

export const getDepartmentByIdService = async (departmentId) => {
  const department = await Department.findById(departmentId)
    .populate('faculty', 'name code');

  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  return department;
};

export const updateDepartmentService = async (departmentId, data) => {
  if (data.code) data.code = data.code.toUpperCase();

  if (data.code && data.faculty) {
    const existing = await Department.findOne({
      _id: { $ne: departmentId },
      code: data.code.toUpperCase(),
      faculty: data.faculty,
    });
    if (existing) {
      throw new ApiError(409, 'Department with this code already exists in this faculty');
    }
  }

  const department = await Department.findByIdAndUpdate(departmentId, data, {
    new: true,
    runValidators: true,
  }).populate('faculty', 'name code');

  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  return department;
};

export const toggleDepartmentStatusService = async (departmentId) => {
  const department = await Department.findById(departmentId);

  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  department.isActive = !department.isActive;
  await department.save();

  return { isActive: department.isActive };
};

export const deleteDepartmentService = async (departmentId) => {
  const department = await Department.findByIdAndDelete(departmentId);

  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  return { message: 'Department deleted successfully' };
};
