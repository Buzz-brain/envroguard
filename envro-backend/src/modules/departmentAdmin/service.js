import { DepartmentAdmin } from './model.js';
import { Faculty } from '../faculty/model.js';
import { Department } from '../department/model.js';
import { generateTokens } from '../../middleware/auth.js';
import { ApiError } from '../../utils/apiError.js';
import { sendInviteEmail } from '../../services/email.service.js';

export const createDepartmentAdminService = async (data, createdBy) => {
  const faculty = await Faculty.findById(data.faculty);
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  const department = await Department.findById(data.department);
  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  if (department.faculty.toString() !== data.faculty) {
    throw new ApiError(400, 'Department does not belong to the specified faculty');
  }

  const existing = await DepartmentAdmin.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'Admin with this email already exists');
  }

  const admin = await DepartmentAdmin.create({
    ...data,
    email: data.email.toLowerCase(),
    createdBy,
  });

  // Send invite email (non-blocking)
  sendInviteEmail(admin.email, admin.fullName);

  return admin;
};

export const getAllDepartmentAdminsService = async (query, facultyFilter = null, departmentFilter = null) => {
  const { page, limit, skip } = getPagination(query);
  const filters = {};
  if (facultyFilter) filters.faculty = facultyFilter;
  if (departmentFilter) filters.department = departmentFilter;

  if (query.search) {
    filters.$or = [
      { fullName: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [admins, total] = await Promise.all([
    DepartmentAdmin.find(filters)
      .populate('faculty', 'name code')
      .populate('department', 'name code')
      .populate('createdBy', 'fullName')
      .sort(buildSort(query))
      .skip(skip)
      .limit(limit),
    DepartmentAdmin.countDocuments(filters),
  ]);

  return { admins, pagination: buildPaginationMeta(total, page, limit) };
};

export const getDepartmentAdminByIdService = async (adminId) => {
  const admin = await DepartmentAdmin.findById(adminId)
    .populate('faculty', 'name code')
    .populate('department', 'name code')
    .select('-refreshToken');

  if (!admin) {
    throw new ApiError(404, 'Department admin not found');
  }

  return admin;
};

export const updateDepartmentAdminService = async (adminId, data) => {
  if (data.email) data.email = data.email.toLowerCase();

  const admin = await DepartmentAdmin.findByIdAndUpdate(adminId, data, {
    new: true,
    runValidators: true,
  }).select('-refreshToken');

  if (!admin) {
    throw new ApiError(404, 'Department admin not found');
  }

  return admin;
};

export const toggleDepartmentAdminStatusService = async (adminId) => {
  const admin = await DepartmentAdmin.findById(adminId);

  if (!admin) {
    throw new ApiError(404, 'Department admin not found');
  }

  admin.isActive = !admin.isActive;
  admin.refreshToken = null;
  await admin.save();

  return { isActive: admin.isActive };
};

export const deleteDepartmentAdminService = async (adminId) => {
  const admin = await DepartmentAdmin.findByIdAndDelete(adminId);

  if (!admin) {
    throw new ApiError(404, 'Department admin not found');
  }

  return { message: 'Department admin deleted successfully' };
};

export const loginDepartmentAdminService = async (email, password) => {
  const admin = await DepartmentAdmin.findOne({ email: email.toLowerCase() })
    .select('+password')
    .populate('department', 'name code');

  if (!admin) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!admin.isActive) {
    throw new ApiError(403, 'Your account has been deactivated');
  }

  const isValid = await admin.comparePassword(password);
  if (!isValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { accessToken, refreshToken } = generateTokens(admin._id, admin.role);
  admin.refreshToken = refreshToken;
  admin.lastLogin = new Date();
  await admin.save();

  return {
    account: {
      id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      faculty: admin.faculty,
      department: admin.department,
    },
    accessToken,
    refreshToken,
  };
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
