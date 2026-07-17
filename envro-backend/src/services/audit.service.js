import { AuditLog } from '../modules/audit/model.js';
import { logger } from '../utils/logger.js';

const roleModelMap = {
  student: 'StudentAccount',
  departmentAdmin: 'DepartmentAdmin',
  facultyAdmin: 'FacultyAdmin',
  environmentalAdmin: 'EnvironmentalAdmin',
};

const roleToModel = (role) => roleModelMap[role] || 'System';

export const createAuditLog = async ({
  actor,
  actorModel,
  actorName,
  action,
  entityType,
  entityId,
  description,
  faculty,
  department,
  ipAddress,
  userAgent,
}) => {
  try {
    await AuditLog.create({
      actor: actor || null,
      actorModel: actorModel || 'System',
      actorName: actorName || '',
      action,
      entityType,
      entityId: entityId || null,
      description,
      faculty: faculty || null,
      department: department || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error: error.message });
  }
};

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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filters),
  ]);

  return { logs, pagination: buildPaginationMeta(total, page, limit) };
};

export const logAction = (resource, action) => {
  return (req, res, next) => {
    const originalSend = res.json;

    res.json = function (body) {
      createAuditLog({
        actor: req.user?.id || null,
        actorModel: req.user?.role ? roleToModel(req.user.role) : 'System',
        action,
        entityType: resource,
        entityId: req.params.id || body?.data?._id || null,
        description: `${req.method} ${req.originalUrl}`,
        ipAddress: req.ip,
      });

      return originalSend.call(this, body);
    };

    next();
  };
};

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
