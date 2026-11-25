import { Router } from 'express';
import { ROLES } from '../constants/enums.js';
import {
  createBatch,
  getBatchDetail,
  listActionRequiredRecords,
  listBatches,
  ownerReview,
  reopenRecord,
  supervisorReview,
  updateBatch,
} from '../controllers/attendanceController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createBatchSchema,
  ownerReviewSchema,
  reopenRecordSchema,
  supervisorReviewSchema,
  updateBatchSchema,
} from '../validations/schemas.js';

const router = Router();

router.use(authenticate);

router.post('/batches', authorize(ROLES.SUB_SUPERVISOR), validate(createBatchSchema), createBatch);
router.get(
  '/batches',
  authorize(ROLES.OWNER, ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR),
  listBatches
);
router.get(
  '/batches/:id',
  authorize(ROLES.OWNER, ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR),
  getBatchDetail
);
router.put(
  '/batches/:id',
  authorize(ROLES.SUB_SUPERVISOR),
  validate(updateBatchSchema),
  updateBatch
);
router.post(
  '/batches/:id/supervisor-review',
  authorize(ROLES.SUPERVISOR),
  validate(supervisorReviewSchema),
  supervisorReview
);
router.post(
  '/batches/:id/owner-review',
  authorize(ROLES.OWNER),
  validate(ownerReviewSchema),
  ownerReview
);
router.post(
  '/records/:id/reopen',
  authorize(ROLES.OWNER),
  validate(reopenRecordSchema),
  reopenRecord
);
router.get(
  '/action-required',
  authorize(ROLES.OWNER, ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR),
  listActionRequiredRecords
);

export default router;
