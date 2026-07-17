import { asyncHandler, apiResponse } from '../../utils/index.js';
import { getAuditLogsService } from './service.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { logs, pagination } = await getAuditLogsService(
    req.query,
    req.user.role,
    req.user.faculty
  );

  return apiResponse(res, 200, 'Audit logs retrieved', logs, { pagination });
});
