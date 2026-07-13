import { EnvironmentalAdmin } from './model.js';
import { Student } from '../student/model.js';
import { StudentAccount } from '../auth/model/StudentAccount.js';
import { DepartmentAdmin } from '../departmentAdmin/model.js';
import { FacultyAdmin } from '../facultyAdmin/model.js';
import { HazardReport } from '../report/model.js';
import { Faculty } from '../faculty/model.js';
import { ApiError } from '../../utils/apiError.js';
import { sendInviteEmail } from '../../services/email.service.js';

export const createEnvironmentalAdminService = async (data) => {
  const existing = await EnvironmentalAdmin.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'Environmental admin with this email already exists');
  }

  const admin = await EnvironmentalAdmin.create({
    ...data,
    email: data.email.toLowerCase(),
  });

  // Send invite email (non-blocking)
  sendInviteEmail(admin.email, admin.fullName);

  return admin;
};

export const getAllEnvironmentalAdminsService = async (query) => {
  const { page, limit, skip } = getPagination(query);

  const [admins, total] = await Promise.all([
    EnvironmentalAdmin.find({})
      .select('-refreshToken')
      .sort(buildSort(query))
      .skip(skip)
      .limit(limit),
    EnvironmentalAdmin.countDocuments({}),
  ]);

  return { admins, pagination: buildPaginationMeta(total, page, limit) };
};

export const updateEnvironmentalAdminService = async (adminId, data) => {
  if (data.email) data.email = data.email.toLowerCase();

  const admin = await EnvironmentalAdmin.findByIdAndUpdate(adminId, data, {
    new: true,
    runValidators: true,
  }).select('-refreshToken');

  if (!admin) {
    throw new ApiError(404, 'Environmental admin not found');
  }

  return admin;
};

export const toggleEnvironmentalAdminStatusService = async (adminId) => {
  const admin = await EnvironmentalAdmin.findById(adminId);

  if (!admin) {
    throw new ApiError(404, 'Environmental admin not found');
  }

  admin.isActive = !admin.isActive;
  admin.refreshToken = null;
  await admin.save();

  return { isActive: admin.isActive };
};

export const deleteEnvironmentalAdminService = async (adminId) => {
  const admin = await EnvironmentalAdmin.findByIdAndDelete(adminId);

  if (!admin) {
    throw new ApiError(404, 'Environmental admin not found');
  }

  return { message: 'Environmental admin deleted successfully' };
};

export const getSystemDashboardService = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const [
    totalStudents,
    totalStudentAccounts,
    totalDepartmentAdmins,
    totalFacultyAdmins,
    totalEnvironmentalAdmins,
    totalFaculties,
    totalReports,
    pendingReports,
    inProgressReports,
    resolvedReports,
    reportsThisMonth,
    reportsThisWeek,
  ] = await Promise.all([
    Student.countDocuments(),
    StudentAccount.countDocuments({ isActive: true }),
    DepartmentAdmin.countDocuments({ isActive: true }),
    FacultyAdmin.countDocuments({ isActive: true }),
    EnvironmentalAdmin.countDocuments({ isActive: true }),
    Faculty.countDocuments({ isActive: true }),
    HazardReport.countDocuments(),
    HazardReport.countDocuments({ status: 'pending' }),
    HazardReport.countDocuments({ status: 'in_progress' }),
    HazardReport.countDocuments({ status: 'resolved' }),
    HazardReport.countDocuments({ createdAt: { $gte: startOfMonth } }),
    HazardReport.countDocuments({ createdAt: { $gte: startOfWeek } }),
  ]);

  const byCategory = await HazardReport.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byFaculty = await HazardReport.aggregate([
    { $lookup: { from: 'faculties', localField: 'faculty', foreignField: '_id', as: 'facultyInfo' } },
    { $unwind: { path: '$facultyInfo', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$facultyInfo.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byStatus = await HazardReport.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const monthlyTrend = await HazardReport.aggregate([
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 },
  ]);

  const recentReports = await HazardReport.find()
    .populate('reportedBy', 'registrationNumber')
    .populate('faculty', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .select('title category status priority faculty createdAt');

  return {
    users: {
      totalStudents,
      activeStudentAccounts: totalStudentAccounts,
      activeDepartmentAdmins: totalDepartmentAdmins,
      activeFacultyAdmins: totalFacultyAdmins,
      activeEnvironmentalAdmins: totalEnvironmentalAdmins,
      activeFaculties: totalFaculties,
    },
    reports: {
      total: totalReports,
      pending: pendingReports,
      inProgress: inProgressReports,
      resolved: resolvedReports,
      thisMonth: reportsThisMonth,
      thisWeek: reportsThisWeek,
    },
    byCategory,
    byFaculty,
    byStatus,
    monthlyTrend,
    recentReports,
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
