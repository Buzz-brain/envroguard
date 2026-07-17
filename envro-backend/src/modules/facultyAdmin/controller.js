import { asyncHandler, apiResponse } from '../../utils/index.js';
import * as facultyAdminService from './service.js';

export const createFacultyAdmin = asyncHandler(async (req, res) => {
  const admin = await facultyAdminService.createFacultyAdminService(
    req.body,
    req.user.id
  );

  return apiResponse(res, 201, 'Faculty admin created successfully', {
    id: admin._id,
    fullName: admin.fullName,
    email: admin.email,
    faculty: admin.faculty,
    isActive: admin.isActive,
  });
});

export const getAllFacultyAdmins = asyncHandler(async (req, res) => {
  const result = await facultyAdminService.getAllFacultyAdminsService(
    req.query,
    req.user.role === 'facultyAdmin' ? req.user.faculty : null
  );

  return apiResponse(res, 200, 'Faculty admins retrieved', result.admins, {
    pagination: result.pagination,
  });
});

export const getFacultyAdminById = asyncHandler(async (req, res) => {
  const admin = await facultyAdminService.getFacultyAdminByIdService(req.params.id);
  return apiResponse(res, 200, 'Faculty admin retrieved', admin);
});

export const updateFacultyAdmin = asyncHandler(async (req, res) => {
  const admin = await facultyAdminService.updateFacultyAdminService(
    req.params.id,
    req.body,
    req.user.id
  );

  return apiResponse(res, 200, 'Faculty admin updated successfully', admin);
});

export const toggleFacultyAdminStatus = asyncHandler(async (req, res) => {
  const result = await facultyAdminService.toggleFacultyAdminStatusService(
    req.params.id,
    req.user.id
  );

  return apiResponse(
    res,
    200,
    `Faculty admin ${result.isActive ? 'activated' : 'deactivated'}`
  );
});

export const deleteFacultyAdmin = asyncHandler(async (req, res) => {
  const result = await facultyAdminService.deleteFacultyAdminService(req.params.id);
  return apiResponse(res, 200, result.message);
});
