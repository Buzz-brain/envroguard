import { asyncHandler, apiResponse } from '../../utils/index.js';
import * as notificationService from './service.js';

const roleToModelMap = {
  student: 'StudentAccount',
  departmentAdmin: 'DepartmentAdmin',
  facultyAdmin: 'FacultyAdmin',
  environmentalAdmin: 'EnvironmentalAdmin',
};

const getRecipientModel = (role) => roleToModelMap[role] || 'StudentAccount';

export const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotificationsService(
    req.user.id,
    getRecipientModel(req.user.role),
    req.query
  );

  return apiResponse(res, 200, 'Notifications retrieved', result.notifications, {
    pagination: result.pagination,
    unreadCount: result.unreadCount,
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsReadService(
    req.params.id,
    req.user.id,
    getRecipientModel(req.user.role)
  );

  return apiResponse(res, 200, 'Notification marked as read', notification);
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsReadService(
    req.user.id,
    getRecipientModel(req.user.role)
  );

  return apiResponse(
    res,
    200,
    `${result.markedCount} notifications marked as read`
  );
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotificationService(
    req.params.id,
    req.user.id,
    getRecipientModel(req.user.role)
  );

  return apiResponse(res, 200, result.message);
});

export const getNotificationStats = asyncHandler(async (req, res) => {
  const stats = await notificationService.getNotificationStatsService(
    req.user.id,
    getRecipientModel(req.user.role)
  );

  return apiResponse(res, 200, 'Notification stats retrieved', stats);
});
