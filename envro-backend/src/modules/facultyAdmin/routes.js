import { Router } from 'express';
import * as facultyAdminController from './controller.js';
import * as facultyAdminValidation from './validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAction } from '../../services/audit.service.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

router.use(authenticate);

// Faculty admins can view admins (scoped to own faculty)
router.get('/', authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN), facultyAdminController.getAllFacultyAdmins);

// Environmental Admin can manage
router.use(authorize(ROLES.ENVIRONMENTAL_ADMIN));

router.post(
  '/',
  facultyAdminValidation.createFacultyAdmin,
  validate,
  logAction('FacultyAdmin', 'create'),
  facultyAdminController.createFacultyAdmin
);

router.get('/:id', facultyAdminController.getFacultyAdminById);

router.patch(
  '/:id',
  facultyAdminValidation.updateFacultyAdmin,
  validate,
  logAction('FacultyAdmin', 'update'),
  facultyAdminController.updateFacultyAdmin
);

router.patch(
  '/:id/toggle-status',
  logAction('FacultyAdmin', 'toggle_status'),
  facultyAdminController.toggleFacultyAdminStatus
);

router.delete(
  '/:id',
  logAction('FacultyAdmin', 'delete'),
  facultyAdminController.deleteFacultyAdmin
);

export default router;
