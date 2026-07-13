import { Router } from 'express';
import * as deviceTokenController from './controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', deviceTokenController.registerToken);
router.delete('/', deviceTokenController.unregisterToken);

export default router;
