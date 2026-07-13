import { asyncHandler, apiResponse } from '../../utils/index.js';
import * as facultyService from './service.js';

export const createFaculty = asyncHandler(async (req, res) => {
  const faculty = await facultyService.createFacultyService(req.body);
  return apiResponse(res, 201, 'Faculty created successfully', faculty);
});

export const getAllFaculties = asyncHandler(async (req, res) => {
  const faculties = await facultyService.getAllFacultiesService(req.query);
  return apiResponse(res, 200, 'Faculties retrieved', faculties);
});

export const getFacultyById = asyncHandler(async (req, res) => {
  const faculty = await facultyService.getFacultyByIdService(req.params.id);
  return apiResponse(res, 200, 'Faculty retrieved', faculty);
});

export const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await facultyService.updateFacultyService(req.params.id, req.body);
  return apiResponse(res, 200, 'Faculty updated successfully', faculty);
});

export const deleteFaculty = asyncHandler(async (req, res) => {
  const result = await facultyService.deleteFacultyService(req.params.id);
  return apiResponse(res, 200, result.message);
});

export const toggleFacultyStatus = asyncHandler(async (req, res) => {
  const result = await facultyService.toggleFacultyStatusService(req.params.id);
  return apiResponse(
    res,
    200,
    `Faculty ${result.isActive ? 'activated' : 'deactivated'}`
  );
});
