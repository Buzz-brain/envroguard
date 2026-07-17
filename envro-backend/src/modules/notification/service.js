import { Notification } from './model.js';
import { ApiError } from '../../utils/apiError.js';
import { sendPushNotification } from '../../services/push.service.js';

const roleModelMap = {
  student: 'StudentAccount',
  departmentAdmin: 'DepartmentAdmin',
  facultyAdmin: 'FacultyAdmin',
  environmentalAdmin: 'EnvironmentalAdmin',
};

export const getRecipientModel = (role) => roleModelMap[role] || 'StudentAccount';

export const createNotificationService = async ({
  recipientId,
  recipientModel,
  type,
  title,
  message,
  relatedEntityType,
  relatedEntityId,
  actorId,
  metadata,
}) => {
  if (actorId && recipientId && actorId.toString() === recipientId.toString()) {
    return null;
  }

  if (!recipientId || !recipientModel || !type || !title || !message) {
    return null;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    recipientModel,
    type,
    title,
    message,
    relatedEntityType: relatedEntityType || null,
    relatedEntityId: relatedEntityId || null,
    metadata: metadata || {},
  });

  sendPushNotification(
    recipientId,
    recipientModel,
    title,
    message,
    { type, ...(relatedEntityId ? { [relatedEntityType?.toLowerCase() + 'Id']: relatedEntityId.toString() } : {}) }
  );

  return notification;
};

export const createBulkNotificationsService = async (notifications) => {
  const valid = notifications.filter(
    (n) => n.recipientId && n.recipientModel && n.type && n.title && n.message
  );

  if (valid.length === 0) return [];

  const created = await Notification.insertMany(
    valid.map((n) => ({
      recipient: n.recipientId,
      recipientModel: n.recipientModel,
      type: n.type,
      title: n.title,
      message: n.message,
      relatedEntityType: n.relatedEntityType || null,
      relatedEntityId: n.relatedEntityId || null,
      metadata: n.metadata || {},
    }))
  );

  for (const n of valid) {
    sendPushNotification(
      n.recipientId,
      n.recipientModel,
      n.title,
      n.message,
      { type: n.type }
    );
  }

  return created;
};

export const getNotificationsService = async (userId, userModel, query) => {
  const { page, limit, skip } = getPagination(query);
  const filters = { recipient: userId, recipientModel: userModel };

  if (query.isRead !== undefined) filters.isRead = query.isRead === 'true';
  if (query.type) filters.type = query.type;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filters),
    Notification.countDocuments({ recipient: userId, recipientModel: userModel, isRead: false }),
  ]);

  return {
    notifications,
    pagination: buildPaginationMeta(total, page, limit),
    unreadCount,
  };
};

export const markAsReadService = async (notificationId, userId, userModel) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId, recipientModel: userModel, isRead: false },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found or already read');
  }

  return notification;
};

export const markAllAsReadService = async (userId, userModel) => {
  const result = await Notification.updateMany(
    { recipient: userId, recipientModel: userModel, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return { markedCount: result.modifiedCount };
};

export const deleteNotificationService = async (notificationId, userId, userModel) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
    recipientModel: userModel,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return { message: 'Notification deleted' };
};

export const getNotificationStatsService = async (userId, userModel) => {
  const [total, unread, read] = await Promise.all([
    Notification.countDocuments({ recipient: userId, recipientModel: userModel }),
    Notification.countDocuments({ recipient: userId, recipientModel: userModel, isRead: false }),
    Notification.countDocuments({ recipient: userId, recipientModel: userModel, isRead: true }),
  ]);

  const byType = await Notification.aggregate([
    { $match: { recipient: userId, recipientModel: userModel } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return { total, unread, read, byType };
};

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 15));
  return { page, limit, skip: (page - 1) * limit };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});
