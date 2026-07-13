import { Router } from 'express';
import * as environmentalAdminController from './controller.js';
import * as environmentalAdminValidation from './validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAction } from '../../services/audit.service.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ENVIRONMENTAL_ADMIN));

// Dashboard analytics
router.get('/dashboard', environmentalAdminController.getSystemDashboard);

// Environmental admin CRUD
router.get('/', environmentalAdminController.getAllEnvironmentalAdmins);

router.post(
  '/',
  environmentalAdminValidation.createEnvironmentalAdmin,
  validate,
  logAction('EnvironmentalAdmin', 'create'),
  environmentalAdminController.createEnvironmentalAdmin
);

router.patch(
  '/:id',
  environmentalAdminValidation.updateEnvironmentalAdmin,
  validate,
  logAction('EnvironmentalAdmin', 'update'),
  environmentalAdminController.updateEnvironmentalAdmin
);

router.patch(
  '/:id/toggle-status',
  logAction('EnvironmentalAdmin', 'toggle_status'),
  environmentalAdminController.toggleEnvironmentalAdminStatus
);

router.delete(
  '/:id',
  logAction('EnvironmentalAdmin', 'delete'),
  environmentalAdminController.deleteEnvironmentalAdmin
);

export default router;
