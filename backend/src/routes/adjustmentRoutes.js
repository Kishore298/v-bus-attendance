import { Router } from 'express';
import { ROLES } from '../constants/enums.js';
import {
  createAdjustment,
  deleteAdjustment,
  listAdjustments,
} from '../controllers/adjustmentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, forbidSubSupervisorFinancials } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createAdjustmentSchema } from '../validations/schemas.js';

const router = Router();

router.use(authenticate, forbidSubSupervisorFinancials, authorize(ROLES.OWNER));
router.get('/', listAdjustments);
router.post('/', validate(createAdjustmentSchema), createAdjustment);
router.delete('/:id', deleteAdjustment);

export default router;
