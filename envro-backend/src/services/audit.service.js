import { AuditLog } from '../modules/audit/model.js';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const roleModelMap = {
  student: 'StudentAccount',
  departmentAdmin: 'DepartmentAdmin',
  facultyAdmin: 'FacultyAdmin',
  environmentalAdmin: 'EnvironmentalAdmin',
};

const roleToModel = (role) => roleModelMap[role] || 'System';

export const roleToActorModel = (role) => roleToModel(role);

const VALID_ACTOR_MODELS = ['StudentAccount', 'DepartmentAdmin', 'FacultyAdmin', 'EnvironmentalAdmin'];

const resolveActorName = async ({ actor, actorModel, actorName }) => {
  if (actorName) return actorName;
  if (!actor || !VALID_ACTOR_MODELS.includes(actorModel)) return '';
  try {
    const Model = mongoose.models[actorModel] || mongoose.model(actorModel);
    const doc = await Model.findById(actor).select('fullName firstName lastName email').lean();
    if (!doc) return '';
    return doc.fullName || `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || doc.email || '';
  } catch (error) {
    logger.error('Failed to resolve audit actor name', { error: error.message });
    return '';
  }
};

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
    const resolvedModel = actorModel || 'System';
    const resolvedActor = actor && VALID_ACTOR_MODELS.includes(resolvedModel) ? actor : null;
    const resolvedName = await resolveActorName({ actor: resolvedActor, actorModel: resolvedModel, actorName });

    await AuditLog.create({
      actor: resolvedActor,
      actorModel: resolvedModel,
      actorName: resolvedName,
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
    filters.description = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  if (query.dateFrom || query.dateTo) {
    const parsedFrom = query.dateFrom && !isNaN(Date.parse(query.dateFrom));
    const parsedTo = query.dateTo && !isNaN(Date.parse(query.dateTo));
    if (parsedFrom || parsedTo) {
      filters.createdAt = {};
      if (parsedFrom) filters.createdAt.$gte = new Date(query.dateFrom);
      if (parsedTo) filters.createdAt.$lte = new Date(query.dateTo);
    }
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
