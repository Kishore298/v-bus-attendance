import { z } from 'zod';
import {
  ADJUSTMENT_CATEGORY,
  ADJUSTMENT_STAGE,
  ADJUSTMENT_TYPE,
  ATTENDANCE_STATUS,
  EMPLOYEE_STATUS,
  EMPLOYEE_TYPES,
  LEAVE_PAID_TYPE,
  PAYROLL_FREQUENCY,
  ROLES,
  SALARY_TYPES,
} from '../constants/enums.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(100),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum([ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR]),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum([ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
});

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  employeeType: z.enum([EMPLOYEE_TYPES.DRIVER, EMPLOYEE_TYPES.CLEANER]),
  mobile: z.string().trim().min(7).max(20),
  joiningDate: z.string().min(4),
  payrollFrequency: z.enum([PAYROLL_FREQUENCY.WEEKLY, PAYROLL_FREQUENCY.MONTHLY]),
  salaryType: z.enum([
    SALARY_TYPES.FIXED_MONTHLY,
    SALARY_TYPES.FIXED_WEEKLY,
    SALARY_TYPES.DAILY_WAGE,
  ]),
  salaryAmount: z.coerce.number().positive(),
  salaryEffectiveDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const updateEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  employeeType: z.enum([EMPLOYEE_TYPES.DRIVER, EMPLOYEE_TYPES.CLEANER]).optional(),
  mobile: z.string().trim().min(7).max(20).optional(),
  joiningDate: z.string().min(4).optional(),
  status: z.enum([EMPLOYEE_STATUS.ACTIVE, EMPLOYEE_STATUS.INACTIVE]).optional(),
  payrollFrequency: z.enum([PAYROLL_FREQUENCY.WEEKLY, PAYROLL_FREQUENCY.MONTHLY]).optional(),
  payrollFrequencyEffectiveFrom: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const updateSalarySchema = z.object({
  salaryType: z.enum([
    SALARY_TYPES.FIXED_MONTHLY,
    SALARY_TYPES.FIXED_WEEKLY,
    SALARY_TYPES.DAILY_WAGE,
  ]),
  amount: z.coerce.number().positive(),
  effectiveFrom: z.string().min(4),
  notes: z.string().max(300).optional(),
});

export const createBatchSchema = z.object({
  attendanceDate: z.string().min(8),
  submitNow: z.boolean().default(true),
  entries: z
    .array(
      z.object({
        employeeId: z.string().min(10),
        status: z.enum(Object.values(ATTENDANCE_STATUS)),
        leavePaidType: z.enum(Object.values(LEAVE_PAID_TYPE)).optional(),
        notes: z.string().max(400).optional(),
      })
    )
    .min(1),
});

export const updateBatchSchema = z.object({
  submitNow: z.boolean().default(true),
  updates: z
    .array(
      z.object({
        attendanceId: z.string().min(10),
        status: z.enum(Object.values(ATTENDANCE_STATUS)),
        leavePaidType: z.enum(Object.values(LEAVE_PAID_TYPE)).optional(),
        notes: z.string().max(400).optional(),
      })
    )
    .default([]),
});

export const supervisorReviewSchema = z.object({
  approveRemaining: z.boolean().default(false),
  actions: z
    .array(
      z.object({
        attendanceId: z.string().min(10),
        decision: z.enum(['APPROVE', 'FLAG', 'RETURN']),
        reason: z.string().max(400).optional(),
      })
    )
    .default([]),
});

export const ownerReviewSchema = z.object({
  approveRemaining: z.boolean().default(false),
  actions: z
    .array(
      z.object({
        attendanceId: z.string().min(10),
        decision: z.enum(['APPROVE', 'RETURN']),
        reason: z.string().max(400).optional(),
      })
    )
    .default([]),
});

export const reopenRecordSchema = z.object({
  reason: z.string().trim().min(3, 'Mandatory reason is required').max(500),
});

export const createAdjustmentSchema = z.object({
  employeeId: z.string().min(10),
  stage: z.enum(Object.values(ADJUSTMENT_STAGE)),
  category: z.enum(Object.values(ADJUSTMENT_CATEGORY)),
  name: z.string().trim().min(2).max(120),
  type: z.enum(Object.values(ADJUSTMENT_TYPE)),
  amount: z.coerce.number().positive(),
  description: z.string().max(400).optional(),
  applicableDate: z.string().min(8),
  attendanceId: z.string().optional().nullable(),
  weekStartKey: z.string().optional(),
});

export const payrollPreviewSchema = z.object({
  frequency: z.enum(Object.values(PAYROLL_FREQUENCY)),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  weekStartKey: z.string().optional(),
});

export const companySettingsSchema = z.object({
  companyName: z.string().trim().min(2).max(140).optional(),
  companyAddress: z.string().trim().min(3).max(300).optional(),
  companyLogoText: z.string().trim().min(1).max(8).optional(),
  companyPhone: z.string().trim().max(30).optional(),
});
