import { asyncHandler, apiResponse } from '../../utils/index.js';
import * as adminService from './service.js';

export const createDepartmentAdmin = asyncHandler(async (req, res) => {
  const admin = await adminService.createDepartmentAdminService(
    req.body,
    req.user.id
  );

  return apiResponse(res, 201, 'Department admin created successfully', {
    id: admin._id,
    fullName: admin.fullName,
    email: admin.email,
    faculty: admin.faculty,
    department: admin.department,
    isActive: admin.isActive,
  });
});

export const getAllDepartmentAdmins = asyncHandler(async (req, res) => {
  const facultyFilter = req.user.role === 'departmentAdmin' ? req.user.faculty : null;
  const departmentFilter = req.user.role === 'departmentAdmin' ? req.user.department : null;

  const result = await adminService.getAllDepartmentAdminsService(
    req.query,
    facultyFilter,
    departmentFilter
  );

  return apiResponse(res, 200, 'Department admins retrieved', result.admins, {
    pagination: result.pagination,
  });
});

export const getDepartmentAdminById = asyncHandler(async (req, res) => {
  const admin = await adminService.getDepartmentAdminByIdService(req.params.id);
  return apiResponse(res, 200, 'Department admin retrieved', admin);
});

export const updateDepartmentAdmin = asyncHandler(async (req, res) => {
  const admin = await adminService.updateDepartmentAdminService(
    req.params.id,
    req.body,
    req.user.id
  );

  return apiResponse(res, 200, 'Department admin updated successfully', admin);
});

export const toggleDepartmentAdminStatus = asyncHandler(async (req, res) => {
  const result = await adminService.toggleDepartmentAdminStatusService(
    req.params.id,
    req.user.id
  );

  return apiResponse(
    res,
    200,
    `Department admin ${result.isActive ? 'activated' : 'deactivated'}`
  );
});

export const deleteDepartmentAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.deleteDepartmentAdminService(req.params.id);
  return apiResponse(res, 200, result.message);
});
