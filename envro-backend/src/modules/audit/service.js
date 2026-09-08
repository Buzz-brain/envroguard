import mongoose from 'mongoose';
import { AuditLog } from './model.js';

const ACTOR_MODELS = ['StudentAccount', 'DepartmentAdmin', 'FacultyAdmin', 'EnvironmentalAdmin'];

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

const resolveActorNames = async (records) => {
  const needName = records.filter((r) => r.actor && !r.actorName);
  if (!needName.length) return;

  const byModel = {};
  for (const r of needName) {
    if (ACTOR_MODELS.includes(r.actorModel)) {
      if (!byModel[r.actorModel]) byModel[r.actorModel] = [];
      byModel[r.actorModel].push(r.actor);
    }
  }

  const nameMap = new Map();
  await Promise.all(
    Object.entries(byModel).map(async ([model, ids]) => {
      try {
        const Model = mongoose.models[model] || mongoose.model(model);
        const docs = await Model.find({ _id: { $in: ids } }).select('firstName lastName email').lean();
        for (const d of docs) {
          nameMap.set(`${model}:${String(d._id)}`, `${d.firstName || ''} ${d.lastName || ''}`.trim());
        }
      } catch (error) {
        console.error(`Failed to resolve actor names for ${model}`, error.message);
      }
    })
  );

  for (const r of records) {
    if (!r.actorName && r.actor) {
      const name = nameMap.get(`${r.actorModel}:${String(r.actor)}`);
      if (name) r.actorName = name;
    }
  }
};

const buildFilters = (query, userRole, userFaculty) => {
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

  return filters;
};

export const getAuditLogsService = async (query, userRole, userFaculty) => {
  const { page, limit, skip } = getPagination(query);
  const filters = buildFilters(query, userRole, userFaculty);

  const [logs, total] = await Promise.all([
    AuditLog.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filters),
  ]);

  await resolveActorNames(logs);

  return { logs, pagination: buildPaginationMeta(total, page, limit) };
};