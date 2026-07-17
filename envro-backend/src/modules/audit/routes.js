import { Router } from 'express';
import * as auditController from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.use(authorize('environmentalAdmin', 'facultyAdmin'));

router.get('/', auditController.getAuditLogs);

export default router;
