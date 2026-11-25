import { Router } from 'express';
import { ROLES } from '../constants/enums.js';
import {
  getAdjustmentsReport,
  getAttendanceReport,
  getPayrollReport,
  getSupervisorReviewReport,
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, forbidSubSupervisorFinancials } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.get(
  '/attendance',
  authorize(ROLES.OWNER, ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR),
  getAttendanceReport
);
router.get(
  '/supervisor-review',
  forbidSubSupervisorFinancials,
  authorize(ROLES.OWNER, ROLES.SUPERVISOR),
  getSupervisorReviewReport
);
router.get('/payroll', forbidSubSupervisorFinancials, authorize(ROLES.OWNER), getPayrollReport);
router.get(
  '/adjustments',
  forbidSubSupervisorFinancials,
  authorize(ROLES.OWNER),
  getAdjustmentsReport
);

export default router;
