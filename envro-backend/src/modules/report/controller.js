import { asyncHandler, apiResponse, ApiError } from '../../utils/index.js';
import * as reportService from './service.js';
import { ROLES } from '../../constants/roles.js';

export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReportService(
    req.body,
    req.files,
    req.user.id
  );

  return apiResponse(res, 201, 'Report submitted successfully', report);
});

export const getAllReports = asyncHandler(async (req, res) => {
  const result = await reportService.getAllReportsService(
    req.query,
    req.user.role,
    req.user.faculty
  );

  return apiResponse(res, 200, 'Reports retrieved', result.reports, {
    pagination: result.pagination,
  });
});

export const getReportById = asyncHandler(async (req, res) => {
  const report = await reportService.getReportByIdService(
    req.params.id,
    req.user.role,
    req.user.faculty
  );

  return apiResponse(res, 200, 'Report retrieved', report);
});

export const updateReportStatus = asyncHandler(async (req, res) => {
  const report = await reportService.updateReportStatusService(
    req.params.id,
    req.body.status,
    req.body.note,
    req.user.id,
    'EnvironmentalAdmin'
  );

  return apiResponse(res, 200, 'Report status updated successfully', report);
});

export const assignReport = asyncHandler(async (req, res) => {
  const report = await reportService.assignReportService(
    req.params.id,
    req.body.adminId
  );

  return apiResponse(res, 200, 'Report assigned successfully', report);
});

export const getMyReports = asyncHandler(async (req, res) => {
  const result = await reportService.getMyReportsService(req.user.id, req.query);

  return apiResponse(res, 200, 'My reports retrieved', result.reports, {
    pagination: result.pagination,
  });
});

export const deleteReport = asyncHandler(async (req, res) => {
  const result = await reportService.deleteReportService(req.params.id);
  return apiResponse(res, 200, result.message);
});

export const getReportStats = asyncHandler(async (req, res) => {
  const stats = await reportService.getReportStatsService(
    req.user.role,
    req.user.faculty
  );

  return apiResponse(res, 200, 'Report statistics retrieved', stats);
});
