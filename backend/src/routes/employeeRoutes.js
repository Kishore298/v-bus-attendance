import { Router } from 'express';
import { ROLES } from '../constants/enums.js';
import {
  createEmployee,
  getEmployee,
  getEmployeeAttendanceHistory,
  listEmployees,
  softDeleteEmployee,
  updateEmployee,
  updateEmployeeSalary,
} from '../controllers/employeeController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, forbidSubSupervisorFinancials } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateSalarySchema,
} from '../validations/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(ROLES.OWNER, ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR), listEmployees);
router.post('/', authorize(ROLES.OWNER), validate(createEmployeeSchema), createEmployee);
router.get('/:id', authorize(ROLES.OWNER, ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR), getEmployee);
router.patch('/:id', authorize(ROLES.OWNER), validate(updateEmployeeSchema), updateEmployee);
router.delete('/:id', authorize(ROLES.OWNER), softDeleteEmployee);
router.get(
  '/:id/attendance-history',
  authorize(ROLES.OWNER, ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR),
  getEmployeeAttendanceHistory
);

router.post(
  '/:id/salary',
  forbidSubSupervisorFinancials,
  authorize(ROLES.OWNER),
  validate(updateSalarySchema),
  updateEmployeeSalary
);

export default router;
