import mongoose from 'mongoose';
import { HazardReport } from './model.js';
import { StudentAccount } from '../auth/model/StudentAccount.js';
import { Student } from '../student/model.js';
import { REPORT_STATUS, NOTIFICATION_TYPES } from '../../constants/hazard.js';
import { ApiError } from '../../utils/apiError.js';
import { createNotificationService } from '../notification/service.js';
import { createAuditLog } from '../../services/audit.service.js';
import { addReportSubmittedEvent, addStatusChangedEvent, addAssignedEvent } from '../../services/timeline.service.js';

export const createReportService = async (data, studentAccountId) => {
  const studentAccount = await StudentAccount.findById(studentAccountId);

  if (!studentAccount) {
    throw new ApiError(404, 'Student account not found');
  }

  const student = await Student.findOne({
    registrationNumber: studentAccount.registrationNumber,
  }).populate('faculty');

  if (!student) {
    throw new ApiError(404, 'Student record not found');
  }

  const images = Array.isArray(data.images)
    ? data.images.map(img => ({ url: img.url, publicId: img.publicId }))
    : [];

  const report = await HazardReport.create({
    title: data.title,
    description: data.description,
    category: data.category,
    images,
    location: {
      type: 'Point',
      coordinates: [
        parseFloat(data.longitude),
        parseFloat(data.latitude),
      ],
      address: data.address,
    },
    reportedBy: studentAccountId,
    studentInfo: {
      registrationNumber: student.registrationNumber,
      fullName: student.fullName,
      faculty: student.faculty?._id || data.faculty || null,
      department: student.department,
    },
    faculty: student.faculty?._id || data.faculty || null,
    status: REPORT_STATUS.PENDING,
    priority: data.priority || 'medium',
  });

  const populatedReport = await HazardReport.findById(report._id)
    .populate('reportedBy', 'registrationNumber')
    .populate('faculty', 'name');

  const facultyAdmins = await mongoose.model('FacultyAdmin').find({ faculty: report.faculty }).select('_id');
  const envAdmins = await mongoose.model('EnvironmentalAdmin').find({}).select('_id');

  const adminRecipients = [
    ...facultyAdmins.map((a) => ({
      recipientId: a._id,
      recipientModel: 'FacultyAdmin',
    })),
    ...envAdmins.map((a) => ({
      recipientId: a._id,
      recipientModel: 'EnvironmentalAdmin',
    })),
  ];

  for (const r of adminRecipients) {
    createNotificationService({
      ...r,
      type: NOTIFICATION_TYPES.REPORT_SUBMITTED,
      title: 'New Hazard Report',
      message: `A new "${report.category}" report was submitted in ${populatedReport.faculty?.name || 'your faculty'}`,
      relatedEntityType: 'Report',
      relatedEntityId: report._id,
      actorId: studentAccountId,
    });
  }

  addReportSubmittedEvent(report._id, studentAccountId, student.fullName);

  createAuditLog({
    actor: studentAccountId,
    actorModel: 'StudentAccount',
    action: 'create_report',
    entityType: 'Report',
    entityId: report._id,
    description: `Student submitted a "${report.category}" report in ${populatedReport.faculty?.name || 'N/A'}`,
    faculty: report.faculty,
  });

  return populatedReport;
};

export const getAllReportsService = async (query, userRole, userFaculty) => {
  const { page, limit, skip } = getPagination(query);
  const filters = buildReportFilters(query, userRole, userFaculty);

  const [reports, total] = await Promise.all([
    HazardReport.find(filters)
      .populate('reportedBy', 'registrationNumber')
      .populate('faculty', 'name')
      .populate('assignedTo', 'fullName email')
      .sort(buildSort(query))
      .skip(skip)
      .limit(limit),
    HazardReport.countDocuments(filters),
  ]);

  return { reports, pagination: buildPaginationMeta(total, page, limit) };
};

export const getReportByIdService = async (reportId, userRole, userFaculty) => {
  const filters = { _id: reportId };
  if (userRole === 'departmentAdmin' && userFaculty) {
    filters.faculty = userFaculty;
  }

  const report = await HazardReport.findOne(filters)
    .populate('reportedBy', 'registrationNumber')
    .populate('faculty', 'name')
    .populate('assignedTo', 'fullName email')
    .populate('statusHistory.changedBy', 'fullName email');

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  return report;
};

export const updateReportStatusService = async (reportId, status, note, adminId, adminModel) => {
  const report = await HazardReport.findById(reportId);

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  report.status = status;
  report.statusHistory.push({
    status,
    changedBy: adminId,
    changedByModel: adminModel,
    note: note || undefined,
    changedAt: new Date(),
  });

  await report.save();

  const statusMessages = {
    [REPORT_STATUS.UNDER_REVIEW]: 'Your report is now under review',
    [REPORT_STATUS.IN_PROGRESS]: 'Work has begun on your report',
    [REPORT_STATUS.RESOLVED]: 'Your report has been resolved',
  };

  createNotificationService({
    recipientId: report.reportedBy,
    recipientModel: 'StudentAccount',
    type: NOTIFICATION_TYPES.REPORT_STATUS_CHANGED,
    title: 'Report Status Updated',
    message: statusMessages[status] || `Report status changed to ${status}`,
    relatedEntityType: 'Report',
    relatedEntityId: report._id,
    metadata: {
      previousStatus: report.statusHistory[report.statusHistory.length - 2]?.status,
      newStatus: status,
      note,
    },
  });

  addStatusChangedEvent(report._id, status, adminId, adminModel, null, note);

  const adminLabel = adminModel === 'EnvironmentalAdmin' ? 'Environmental Admin' : 'Faculty Admin';

  createAuditLog({
    actor: adminId,
    actorModel: adminModel,
    action: 'update_report_status',
    entityType: 'Report',
    entityId: report._id,
    description: `${adminLabel} changed report status to ${status}${note ? `: ${note}` : ''}`,
    faculty: report.faculty,
  });

  const updatedReport = await HazardReport.findById(reportId)
    .populate('reportedBy', 'registrationNumber')
    .populate('faculty', 'name')
    .populate('statusHistory.changedBy', 'fullName');

  return updatedReport;
};

export const assignReportService = async (reportId, adminId, actorId) => {
  const report = await HazardReport.findByIdAndUpdate(
    reportId,
    { assignedTo: adminId },
    { new: true }
  )
    .populate('assignedTo', 'fullName email')
    .populate('faculty', 'name');

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  addAssignedEvent(report._id, adminId, null, actorId, 'EnvironmentalAdmin');

  createNotificationService({
    recipientId: adminId,
    recipientModel: 'FacultyAdmin',
    type: NOTIFICATION_TYPES.REPORT_ASSIGNED,
    title: 'Report Assigned',
    message: `Report "${report.title}" has been assigned to you`,
    relatedEntityType: 'Report',
    relatedEntityId: report._id,
    actorId,
  });

  return report;
};

export const getMyReportsService = async (studentAccountId, query) => {
  const { page, limit, skip } = getPagination(query);
  const filters = { reportedBy: studentAccountId };

  if (query.status) filters.status = query.status;
  if (query.category) filters.category = query.category;

  const [reports, total] = await Promise.all([
    HazardReport.find(filters)
      .populate('faculty', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    HazardReport.countDocuments(filters),
  ]);

  return { reports, pagination: buildPaginationMeta(total, page, limit) };
};

export const deleteReportService = async (reportId, actorId) => {
  const report = await HazardReport.findById(reportId);

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  await HazardReport.findByIdAndDelete(reportId);

  createAuditLog({
    actor: actorId,
    action: 'delete_report',
    entityType: 'Report',
    entityId: reportId,
    description: `Deleted report: ${report.title}`,
    faculty: report.faculty,
  });

  return { message: 'Report deleted successfully' };
};

export const getReportStatsService = async (userRole, userFaculty) => {
  const filters = {};
  if (userRole === 'departmentAdmin' && userFaculty) {
    filters.faculty = userFaculty;
  }

  const [total, pending, inProgress, resolved, critical] = await Promise.all([
    HazardReport.countDocuments(filters),
    HazardReport.countDocuments({ ...filters, status: REPORT_STATUS.PENDING }),
    HazardReport.countDocuments({ ...filters, status: REPORT_STATUS.IN_PROGRESS }),
    HazardReport.countDocuments({ ...filters, status: REPORT_STATUS.RESOLVED }),
    HazardReport.countDocuments({ ...filters, priority: 'critical' }),
  ]);

  const byCategory = await HazardReport.aggregate([
    { $match: filters },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const recentReports = await HazardReport.find(filters)
    .populate('reportedBy', 'registrationNumber')
    .populate('faculty', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    total,
    pending,
    inProgress,
    resolved,
    critical,
    byCategory,
    recentReports,
  };
};

// ─── Private Helpers ─────────────────────────────────────────────────────

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

const buildReportFilters = (query, userRole, userFaculty) => {
  const filters = {};

  // Faculty-scoped access
  if (userRole === 'departmentAdmin' && userFaculty) {
    filters.faculty = userFaculty;
  }

  if (query.status) filters.status = query.status;
  if (query.category) filters.category = query.category;
  if (query.priority) filters.priority = query.priority;
  if (query.faculty) filters.faculty = query.faculty;

  if (query.search) {
    filters.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { 'location.address': { $regex: query.search, $options: 'i' } },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {};
    if (query.dateFrom) filters.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filters.createdAt.$lte = new Date(query.dateTo);
  }

  return filters;
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
