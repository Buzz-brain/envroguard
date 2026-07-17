import { Router } from 'express';
import authRoutes from '../modules/auth/routes.js';
import studentRoutes from '../modules/student/routes.js';
import facultyRoutes from '../modules/faculty/routes.js';
import reportRoutes from '../modules/report/routes.js';
import notificationRoutes from '../modules/notification/routes.js';
import deviceTokenRoutes from '../modules/deviceToken/routes.js';
import departmentAdminRoutes from '../modules/departmentAdmin/routes.js';
import facultyAdminRoutes from '../modules/facultyAdmin/routes.js';
import environmentalAdminRoutes from '../modules/environmentalAdmin/routes.js';
import departmentRoutes from '../modules/department/routes.js';
import auditRoutes from '../modules/audit/routes.js';

export const setupRoutes = () => {
  const router = Router();

  // Auth routes (public + authenticated)
  router.use('/auth', authRoutes);

  // Faculty routes
  router.use('/faculties', facultyRoutes);

  // Student routes
  router.use('/students', studentRoutes);

  // Department routes
  router.use('/departments', departmentRoutes);

  // Department Admin routes
  router.use('/department-admin', departmentAdminRoutes);

  // Faculty Admin routes
  router.use('/faculty-admin', facultyAdminRoutes);

  // Environmental Admin routes
  router.use('/environmental-admin', environmentalAdminRoutes);

  // Report routes
  router.use('/reports', reportRoutes);

  // Notification routes
  router.use('/notifications', notificationRoutes);

  // Device Token routes
  router.use('/device-tokens', deviceTokenRoutes);

  // Audit Log routes
  router.use('/audit-logs', auditRoutes);

  return router;
};
