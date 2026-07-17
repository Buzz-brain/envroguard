import { AuditLog } from './model.js';

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});

export const getAuditLogsService = async (query, userRole, userFaculty) => {
  const { page, limit, skip } = getPagination(query);
  const filters = {};

  if (userRole === 'facultyAdmin' && userFaculty) {
    filters.faculty = userFaculty;
  }

  if (query.entityType) filters.entityType = query.entityType;
  if (query.action) filters.action = query.action;
  if (query.actor) filters.actor = query.actor;

  if (query.search) {
    filters.description = { $regex: query.search, $options: 'i' };
  }

  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {};
    if (query.dateFrom) filters.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filters.createdAt.$lte = new Date(query.dateTo);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filters)
      .populate('actor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filters),
  ]);

  return { logs, pagination: buildPaginationMeta(total, page, limit) };
};
