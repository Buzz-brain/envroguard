import { asyncHandler, apiResponse } from '../../utils/index.js';
import * as departmentService from './service.js';

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.createDepartmentService(req.body, req.user.id);
  return apiResponse(res, 201, 'Department created successfully', department);
});

export const getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await departmentService.getAllDepartmentsService(req.query);
  return apiResponse(res, 200, 'Departments retrieved', departments);
});

export const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await departmentService.getDepartmentByIdService(req.params.id);
  return apiResponse(res, 200, 'Department retrieved', department);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.updateDepartmentService(req.params.id, req.body, req.user.id);
  return apiResponse(res, 200, 'Department updated successfully', department);
});

export const toggleDepartmentStatus = asyncHandler(async (req, res) => {
  const result = await departmentService.toggleDepartmentStatusService(req.params.id, req.user.id);
  return apiResponse(
    res,
    200,
    `Department ${result.isActive ? 'activated' : 'deactivated'}`
  );
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const result = await departmentService.deleteDepartmentService(req.params.id);
  return apiResponse(res, 200, result.message);
});
