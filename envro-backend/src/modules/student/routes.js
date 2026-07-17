import { Router } from 'express';
import * as studentController from './controller.js';
import * as studentValidation from './validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { uploadMiddleware, uploadDocuments } from '../../middleware/upload.js';
import { logAction } from '../../services/audit.service.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Import students (CSV/Excel) — department admin & faculty admin
router.post(
  '/import',
  authenticate,
  authorize(ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY_ADMIN),
  uploadDocuments.single('file'),
  studentValidation.importStudents,
  validate,
  logAction('Student', 'import'),
  studentController.importStudents
);

// Batch create students (form-based) — department admin only
router.post(
  '/batch',
  authenticate,
  authorize(ROLES.DEPARTMENT_ADMIN),
  studentValidation.batchCreateStudents,
  validate,
  logAction('Student', 'batch_create'),
  studentController.batchCreateStudents
);

// Search — department admin & faculty admin (read-only)
router.get(
  '/search',
  authenticate,
  authorize(ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  studentController.searchStudents
);

// Stats — department admin, faculty admin & environmental admin
router.get(
  '/stats',
  authenticate,
  authorize(ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN),
  studentController.getStudentStats
);

// CRUD — department admin (manage) + faculty admin & environmental admin (read-only)
router.use(authenticate);

router.get('/', authorize(ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN), studentController.getAllStudents);
router.get('/:id', authorize(ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY_ADMIN, ROLES.ENVIRONMENTAL_ADMIN), studentController.getStudentById);

router.patch(
  '/:id',
  authorize(ROLES.DEPARTMENT_ADMIN),
  studentValidation.updateStudent,
  validate,
  logAction('Student', 'update'),
  studentController.updateStudent
);

router.delete(
  '/:id',
  authorize(ROLES.DEPARTMENT_ADMIN),
  logAction('Student', 'delete'),
  studentController.deleteStudent
);

export default router;
