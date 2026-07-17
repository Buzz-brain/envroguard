import { Faculty } from './model.js';
import { ApiError } from '../../utils/apiError.js';
import { createNotificationService } from '../notification/service.js';
import { createAuditLog } from '../../services/audit.service.js';
import { NOTIFICATION_TYPES } from '../../constants/hazard.js';

export const createFacultyService = async (data, actorId) => {
  const faculty = await Faculty.create(data);

  createAuditLog({
    actor: actorId,
    actorModel: 'EnvironmentalAdmin',
    action: 'create_faculty',
    entityType: 'Faculty',
    entityId: faculty._id,
    description: `Created faculty: ${faculty.name}`,
  });

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

export const updateFacultyService = async (facultyId, data, actorId) => {
  const faculty = await Faculty.findByIdAndUpdate(facultyId, data, {
    new: true,
    runValidators: true,
  });

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  createAuditLog({
    actor: actorId,
    actorModel: 'EnvironmentalAdmin',
    action: 'update_faculty',
    entityType: 'Faculty',
    entityId: faculty._id,
    description: `Updated faculty: ${faculty.name}`,
  });

  return faculty;
};

export const deleteFacultyService = async (facultyId) => {
  const faculty = await Faculty.findByIdAndDelete(facultyId);

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  createAuditLog({
    action: 'delete_faculty',
    entityType: 'Faculty',
    entityId: facultyId,
    description: `Deleted faculty: ${faculty.name}`,
  });

  return { message: 'Faculty deleted successfully' };
};

export const toggleFacultyStatusService = async (facultyId, actorId) => {
  const faculty = await Faculty.findById(facultyId);

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  faculty.isActive = !faculty.isActive;
  await faculty.save();

  createAuditLog({
    actor: actorId,
    actorModel: 'EnvironmentalAdmin',
    action: `toggle_faculty_${faculty.isActive ? 'activate' : 'deactivate'}`,
    entityType: 'Faculty',
    entityId: faculty._id,
    description: `${faculty.isActive ? 'Activated' : 'Deactivated'} faculty: ${faculty.name}`,
  });

  return { isActive: faculty.isActive };
};
