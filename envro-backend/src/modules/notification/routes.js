import { Router } from 'express';
import * as notificationController from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { logAction } from '../../services/audit.service.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/stats', notificationController.getNotificationStats);

router.patch(
  '/:id/read',
  logAction('Notification', 'mark_read'),
  notificationController.markAsRead
);

router.patch(
  '/mark-all-read',
  logAction('Notification', 'mark_all_read'),
  notificationController.markAllAsRead
);

router.delete(
  '/:id',
  logAction('Notification', 'delete'),
  notificationController.deleteNotification
);

export default router;
