import { Router } from 'express';
import * as adminController from './controller.js';
import * as adminValidation from './validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAction } from '../../services/audit.service.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Department admins can view admins (scoped to own faculty/department)
router.get('/', authorize(ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN), adminController.getAllDepartmentAdmins);

// Faculty Admin and Environmental Admin can manage
router.post(
  '/',
  authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  adminValidation.createDepartmentAdmin,
  validate,
  logAction('DepartmentAdmin', 'create'),
  adminController.createDepartmentAdmin
);

router.get('/:id', authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN), adminController.getDepartmentAdminById);

router.patch(
  '/:id',
  authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  adminValidation.updateDepartmentAdmin,
  validate,
  logAction('DepartmentAdmin', 'update'),
  adminController.updateDepartmentAdmin
);

router.patch(
  '/:id/toggle-status',
  authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  logAction('DepartmentAdmin', 'toggle_status'),
  adminController.toggleDepartmentAdminStatus
);

router.delete(
  '/:id',
  authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  logAction('DepartmentAdmin', 'delete'),
  adminController.deleteDepartmentAdmin
);

export default router;
