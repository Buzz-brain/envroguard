import { asyncHandler, apiResponse } from '../../utils/index.js';
import * as environmentalAdminService from './service.js';

export const createEnvironmentalAdmin = asyncHandler(async (req, res) => {
  const admin = await environmentalAdminService.createEnvironmentalAdminService(
    req.body
  );

  return apiResponse(res, 201, 'Environmental admin created successfully', {
    id: admin._id,
    fullName: admin.fullName,
    email: admin.email,
    isActive: admin.isActive,
  });
});

export const getAllEnvironmentalAdmins = asyncHandler(async (req, res) => {
  const result = await environmentalAdminService.getAllEnvironmentalAdminsService(req.query);
  return apiResponse(res, 200, 'Environmental admins retrieved', result.admins, {
    pagination: result.pagination,
  });
});

export const updateEnvironmentalAdmin = asyncHandler(async (req, res) => {
  const admin = await environmentalAdminService.updateEnvironmentalAdminService(
    req.params.id,
    req.body
  );

  return apiResponse(res, 200, 'Environmental admin updated successfully', admin);
});

export const toggleEnvironmentalAdminStatus = asyncHandler(async (req, res) => {
  const result = await environmentalAdminService.toggleEnvironmentalAdminStatusService(
    req.params.id
  );

  return apiResponse(
    res,
    200,
    `Environmental admin ${result.isActive ? 'activated' : 'deactivated'}`
  );
});

export const deleteEnvironmentalAdmin = asyncHandler(async (req, res) => {
  const result = await environmentalAdminService.deleteEnvironmentalAdminService(req.params.id);
  return apiResponse(res, 200, result.message);
});

export const getSystemDashboard = asyncHandler(async (req, res) => {
  const dashboard = await environmentalAdminService.getSystemDashboardService();
  return apiResponse(res, 200, 'System dashboard retrieved', dashboard);
});
