import { Router } from 'express';
import * as reportController from './controller.js';
import * as reportValidation from './validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAction } from '../../services/audit.service.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// All report routes require authentication
router.use(authenticate);

// Student: create report, view own reports
router.post(
  '/',
  authorize(ROLES.STUDENT),
  reportValidation.createReport,
  validate,
  logAction('HazardReport', 'create'),
  reportController.createReport
);

router.get('/my-reports', authorize(ROLES.STUDENT), reportController.getMyReports);

// Environmental Admin and Faculty Admin: view reports
router.get('/stats', authorize(ROLES.ENVIRONMENTAL_ADMIN, ROLES.FACULTY_ADMIN, ROLES.DEPARTMENT_ADMIN), reportController.getReportStats);
router.get('/', authorize(ROLES.ENVIRONMENTAL_ADMIN, ROLES.FACULTY_ADMIN, ROLES.DEPARTMENT_ADMIN), reportController.getAllReports);
router.get('/:id', authorize(ROLES.ENVIRONMENTAL_ADMIN, ROLES.FACULTY_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.STUDENT), reportController.getReportById);

// Status updates — environmental admin only
router.patch(
  '/:id/status',
  authorize(ROLES.ENVIRONMENTAL_ADMIN),
  reportValidation.updateReportStatus,
  validate,
  logAction('HazardReport', 'update_status'),
  reportController.updateReportStatus
);

// Assign report — environmental admin only
router.patch(
  '/:id/assign',
  authorize(ROLES.ENVIRONMENTAL_ADMIN),
  reportValidation.assignReport,
  validate,
  logAction('HazardReport', 'assign'),
  reportController.assignReport
);

// Timeline
router.get('/:id/timeline', authorize(ROLES.ENVIRONMENTAL_ADMIN, ROLES.FACULTY_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.STUDENT), reportController.getReportTimeline);

// Delete report — environmental admin only
router.delete(
  '/:id',
  authorize(ROLES.ENVIRONMENTAL_ADMIN),
  logAction('HazardReport', 'delete'),
  reportController.deleteReport
);

export default router;
