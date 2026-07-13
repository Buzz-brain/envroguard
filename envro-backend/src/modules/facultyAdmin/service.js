import { FacultyAdmin } from './model.js';
import { Faculty } from '../faculty/model.js';
import { ApiError } from '../../utils/apiError.js';
import { sendInviteEmail } from '../../services/email.service.js';

export const createFacultyAdminService = async (data, createdBy) => {
  const faculty = await Faculty.findById(data.faculty);
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  const existing = await FacultyAdmin.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'Faculty admin with this email already exists');
  }

  const admin = await FacultyAdmin.create({
    ...data,
    email: data.email.toLowerCase(),
    createdBy,
  });

  // Send invite email (non-blocking)
  sendInviteEmail(admin.email, admin.fullName);

  return admin;
};

export const getAllFacultyAdminsService = async (query, facultyFilter = null) => {
  const { page, limit, skip } = getPagination(query);
  const filters = {};
  if (facultyFilter) filters.faculty = facultyFilter;

  if (query.search) {
    filters.$or = [
      { fullName: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [admins, total] = await Promise.all([
    FacultyAdmin.find(filters)
      .populate('faculty', 'name code')
      .populate('createdBy', 'fullName')
      .select('-refreshToken')
      .sort(buildSort(query))
      .skip(skip)
      .limit(limit),
    FacultyAdmin.countDocuments(filters),
  ]);

  return { admins, pagination: buildPaginationMeta(total, page, limit) };
};

export const getFacultyAdminByIdService = async (adminId) => {
  const admin = await FacultyAdmin.findById(adminId)
    .populate('faculty', 'name code')
    .populate('createdBy', 'fullName')
    .select('-refreshToken');

  if (!admin) {
    throw new ApiError(404, 'Faculty admin not found');
  }

  return admin;
};

export const updateFacultyAdminService = async (adminId, data) => {
  if (data.email) data.email = data.email.toLowerCase();

  const admin = await FacultyAdmin.findByIdAndUpdate(adminId, data, {
    new: true,
    runValidators: true,
  }).select('-refreshToken');

  if (!admin) {
    throw new ApiError(404, 'Faculty admin not found');
  }

  return admin;
};

export const toggleFacultyAdminStatusService = async (adminId) => {
  const admin = await FacultyAdmin.findById(adminId);

  if (!admin) {
    throw new ApiError(404, 'Faculty admin not found');
  }

  admin.isActive = !admin.isActive;
  admin.refreshToken = null;
  await admin.save();

  return { isActive: admin.isActive };
};

export const deleteFacultyAdminService = async (adminId) => {
  const admin = await FacultyAdmin.findByIdAndDelete(adminId);

  if (!admin) {
    throw new ApiError(404, 'Faculty admin not found');
  }

  return { message: 'Faculty admin deleted successfully' };
};

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

const buildSort = (query) => {
  if (query.sort) {
    const field = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
    const order = query.sort.startsWith('-') ? -1 : 1;
    return { [field]: order };
  }
  return { createdAt: -1 };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});
