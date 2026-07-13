import { Router } from 'express';
import * as facultyController from './controller.js';
import * as facultyValidation from './validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAction } from '../../services/audit.service.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Public: list all faculties (needed for registration form)
router.get('/', facultyController.getAllFaculties);
router.get('/:id', facultyController.getFacultyById);

// Protected: only environmental admin can manage faculties
router.use(authenticate);
router.use(authorize(ROLES.ENVIRONMENTAL_ADMIN));

router.post(
  '/',
  facultyValidation.createFaculty,
  validate,
  logAction('Faculty', 'create'),
  facultyController.createFaculty
);

router.patch(
  '/:id',
  facultyValidation.updateFaculty,
  validate,
  logAction('Faculty', 'update'),
  facultyController.updateFaculty
);

router.patch(
  '/:id/toggle-status',
  logAction('Faculty', 'toggle_status'),
  facultyController.toggleFacultyStatus
);

router.delete(
  '/:id',
  logAction('Faculty', 'delete'),
  facultyController.deleteFaculty
);

export default router;
