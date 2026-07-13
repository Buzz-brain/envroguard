import { AuditLog } from '../modules/audit/model.js';
import { logger } from '../utils/logger.js';

export const createAuditLog = async ({
  actor,
  actorModel,
  action,
  resource,
  resourceId,
  details,
  ipAddress,
  userAgent,
}) => {
  try {
    await AuditLog.create({
      actor,
      actorModel: actorModel || 'System',
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error: error.message });
  }
};

export const logAction = (resource, action) => {
  return (req, res, next) => {
    const originalSend = res.json;

    res.json = function (body) {
      createAuditLog({
        actor: req.user?.id || null,
        actorModel: req.user?.role ? roleToModel(req.user.role) : 'System',
        action,
        resource,
        resourceId: req.params.id || body?.data?._id || null,
        details: {
          method: req.method,
          path: req.originalUrl,
          ...(req.body && Object.keys(req.body).length > 0
            ? { body: sanitizeBody(req.body) }
            : {}),
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return originalSend.call(this, body);
    };

    next();
  };
};

const roleModelMap = {
  student: 'StudentAccount',
  departmentAdmin: 'DepartmentAdmin',
  facultyAdmin: 'FacultyAdmin',
  environmentalAdmin: 'EnvironmentalAdmin',
};

const roleToModel = (role) => roleModelMap[role] || 'System';

const sanitizeBody = (body) => {
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.otp;
  return sanitized;
};
