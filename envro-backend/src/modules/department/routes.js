import { Router } from 'express';
import * as departmentController from './controller.js';
import * as departmentValidation from './validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize, authorizeFaculty } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAction } from '../../services/audit.service.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List is open to all authenticated users
router.get('/', departmentController.getAllDepartments);
router.get('/:id', departmentController.getDepartmentById);

// Create - faculty admin or environmental admin
router.post(
  '/',
  authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  authorizeFaculty,
  departmentValidation.createDepartment,
  validate,
  logAction('Department', 'create'),
  departmentController.createDepartment
);

router.patch(
  '/:id',
  authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  authorizeFaculty,
  departmentValidation.updateDepartment,
  validate,
  logAction('Department', 'update'),
  departmentController.updateDepartment
);

router.patch(
  '/:id/toggle-status',
  authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  authorizeFaculty,
  logAction('Department', 'toggle_status'),
  departmentController.toggleDepartmentStatus
);

router.delete(
  '/:id',
  authorize(ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  authorizeFaculty,
  logAction('Department', 'delete'),
  departmentController.deleteDepartment
);

export default router;
