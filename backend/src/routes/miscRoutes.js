import { Router } from 'express';
import { ROLES } from '../constants/enums.js';
import {
  getCompanySettings,
  listAuditLogs,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateCompanySettings,
} from '../controllers/miscController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, forbidSubSupervisorFinancials } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { companySettingsSchema } from '../validations/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/notifications', listNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);

router.get('/audit-logs', forbidSubSupervisorFinancials, authorize(ROLES.OWNER), listAuditLogs);

router.get('/settings', forbidSubSupervisorFinancials, authorize(ROLES.OWNER), getCompanySettings);
router.put(
  '/settings',
  forbidSubSupervisorFinancials,
  authorize(ROLES.OWNER),
  validate(companySettingsSchema),
  updateCompanySettings
);

export default router;
