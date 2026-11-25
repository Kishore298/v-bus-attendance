import { Router } from 'express';
import { ROLES } from '../constants/enums.js';
import {
  getOwnerDashboard,
  getSubSupervisorDashboard,
  getSupervisorDashboard,
} from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, forbidSubSupervisorFinancials } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.get('/owner', forbidSubSupervisorFinancials, authorize(ROLES.OWNER), getOwnerDashboard);
router.get(
  '/supervisor',
  forbidSubSupervisorFinancials,
  authorize(ROLES.SUPERVISOR, ROLES.OWNER),
  getSupervisorDashboard
);
router.get(
  '/sub-supervisor',
  authorize(ROLES.SUB_SUPERVISOR),
  getSubSupervisorDashboard
);

export default router;
