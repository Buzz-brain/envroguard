import { asyncHandler, apiResponse } from '../../utils/index.js';
import * as studentService from './service.js';

export const importStudents = asyncHandler(async (req, res) => {
  if (!req.file) {
    return apiResponse(res, 400, 'No file uploaded. Please upload a CSV or Excel file.');
  }

  const facultyId = req.body.facultyId;
  const fileType = req.file.mimetype.includes('csv') ? 'csv' : 'excel';

  const results = await studentService.importStudentsService(
    req.file.buffer,
    facultyId,
    fileType,
    req.user.id,
    req.user.role,
    req.user.department,
    req.user.departmentCode
  );

  return apiResponse(res, 200, 'Student import completed', results);
});

export const batchCreateStudents = asyncHandler(async (req, res) => {
  const results = await studentService.batchCreateStudentsService(
    req.body.students,
    req.user.faculty,
    req.user.id
  );

  return apiResponse(res, 200, 'Batch student creation completed', results);
});

export const getAllStudents = asyncHandler(async (req, res) => {
  const result = await studentService.getAllStudentsService(
    req.query,
    req.user.faculty
  );

  return apiResponse(res, 200, 'Students retrieved', result.students, {
    pagination: result.pagination,
  });
});

export const getStudentById = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentByIdService(
    req.params.id,
    req.user.faculty
  );

  return apiResponse(res, 200, 'Student retrieved', student);
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudentService(
    req.params.id,
    req.body,
    req.user.faculty
  );

  return apiResponse(res, 200, 'Student updated successfully', student);
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const result = await studentService.deleteStudentService(
    req.params.id,
    req.user.faculty,
    req.user.id
  );

  return apiResponse(res, 200, result.message);
});

export const searchStudents = asyncHandler(async (req, res) => {
  const students = await studentService.searchStudentsService(
    req.query.q,
    req.user.faculty
  );

  return apiResponse(res, 200, 'Search results', students);
});

export const getStudentStats = asyncHandler(async (req, res) => {
  const stats = await studentService.getStudentStatsService(req.user.faculty);
  return apiResponse(res, 200, 'Student statistics', stats);
});
