import { Router } from 'express';
import { ROLES } from '../constants/enums.js';
import {
  downloadPayslipPdf,
  finalizePayrollHandler,
  getPayrollDetail,
  listPayrolls,
  previewPayroll,
} from '../controllers/payrollController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, forbidSubSupervisorFinancials } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { payrollPreviewSchema } from '../validations/schemas.js';

const router = Router();

router.use(authenticate, forbidSubSupervisorFinancials, authorize(ROLES.OWNER));
router.post('/preview', validate(payrollPreviewSchema), previewPayroll);
router.get('/', listPayrolls);
router.get('/:id', getPayrollDetail);
router.post('/:id/finalize', finalizePayrollHandler);
router.get('/items/:itemId/payslip.pdf', downloadPayslipPdf);

export default router;
