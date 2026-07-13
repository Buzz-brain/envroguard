import { Faculty } from './model.js';
import { ApiError } from '../../utils/apiError.js';

export const createFacultyService = async (data) => {
  const faculty = await Faculty.create(data);
  return faculty;
};

export const getAllFacultiesService = async (filters = {}) => {
  const query = {};

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const faculties = await Faculty.find(query).sort({ name: 1 });

  return faculties;
};

export const getFacultyByIdService = async (facultyId) => {
  const faculty = await Faculty.findById(facultyId);

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  return faculty;
};

export const updateFacultyService = async (facultyId, data) => {
  const faculty = await Faculty.findByIdAndUpdate(facultyId, data, {
    new: true,
    runValidators: true,
  });

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  return faculty;
};

export const deleteFacultyService = async (facultyId) => {
  const faculty = await Faculty.findByIdAndDelete(facultyId);

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  return { message: 'Faculty deleted successfully' };
};

export const toggleFacultyStatusService = async (facultyId) => {
  const faculty = await Faculty.findById(facultyId);

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  faculty.isActive = !faculty.isActive;
  await faculty.save();

  return { isActive: faculty.isActive };
};
