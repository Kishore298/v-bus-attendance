import {
  ADJUSTMENT_INCLUSION_STATUS,
  ATTENDANCE_APPROVAL_STATUS,
  EMPLOYEE_STATUS,
  PAYROLL_FREQUENCY,
  PAYROLL_STATUS,
  ROLES,
} from '../constants/enums.js';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { Payroll } from '../models/Payroll.js';
import { PayrollItem } from '../models/PayrollItem.js';
import { SalaryAdjustment } from '../models/SalaryAdjustment.js';
import { SalaryStructure } from '../models/SalaryStructure.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { getMonthPeriod, getWeekPeriodFromStart } from '../utils/dates.js';
import { AppError } from '../utils/errors.js';
import { runWithTransaction } from '../utils/transactions.js';
import { recordAudit } from './auditService.js';
import { notifyRoles } from './notificationService.js';
import { calculateEmployeePayroll, round2 } from './salaryEngine.js';

export function resolvePayrollPeriod({ frequency, year, month, weekStartKey }) {
  if (frequency === PAYROLL_FREQUENCY.MONTHLY) {
    if (!year || !month) throw new AppError('year and month are required for monthly payroll', 400);
    return getMonthPeriod(year, month);
  }
  if (frequency === PAYROLL_FREQUENCY.WEEKLY) {
    if (!weekStartKey) throw new AppError('weekStartKey (YYYY-MM-DD) is required for weekly payroll', 400);
    return getWeekPeriodFromStart(weekStartKey);
  }
  throw new AppError('Invalid payroll frequency', 400);
}

async function resolveSalaryStructureForPeriod(employeeId, periodStart, periodEnd) {
  let structure = await SalaryStructure.findOne({
    employeeId,
    effectiveFrom: { $lte: periodEnd },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
  })
    .sort({ effectiveFrom: -1, createdAt: -1 })
    .lean();

  if (!structure) {
    structure = await SalaryStructure.findOne({ employeeId, isActive: true })
      .sort({ effectiveFrom: -1, createdAt: -1 })
      .lean();
  }
  return structure;
}

async function getCompanyConfig() {
  let setting = await SystemSetting.findOne({ key: 'COMPANY_CONFIG' }).lean();
  if (!setting) {
    setting = await SystemSetting.create({ key: 'COMPANY_CONFIG' });
  }
  return setting;
}

export async function generatePayrollPreview({ actor, frequency, year, month, weekStartKey, ipAddress }) {
  const period = resolvePayrollPeriod({ frequency, year, month, weekStartKey });

  const existing = await Payroll.findOne({ frequency, periodKey: period.periodKey });
  if (existing && existing.status === PAYROLL_STATUS.FINALIZED) {
    throw new AppError(
      `Payroll for ${frequency} period ${period.periodKey} is already finalized and immutable`,
      409
    );
  }

  const companyConfig = await getCompanyConfig();

  // Include active employees with matching payrollFrequency OR inactive employees who still have owner-approved attendance/pending adjustments in this period
  const freqEmployees = await Employee.find({
    isDeleted: false,
    payrollFrequency: frequency,
    joiningDate: { $lte: period.periodEnd },
  }).lean();

  const freqEmployeeIds = new Set(freqEmployees.map((e) => String(e._id)));

  // Also check if any employee with matching frequency is active, or inactive with approved attendance in period
  const approvedAttendance = await Attendance.find({
    attendanceDateKey: { $gte: period.periodStartKey, $lte: period.periodEndKey },
    approvalStatus: ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED,
    eligibleForPayroll: true,
    payrollId: null,
  }).lean();

  const pendingAdjustments = await SalaryAdjustment.find({
    inclusionStatus: {
      $in: [ADJUSTMENT_INCLUSION_STATUS.PENDING, ADJUSTMENT_INCLUSION_STATUS.RESERVED],
    },
    payrollId: null,
    $or: [
      { periodKey: period.periodKey },
      { applicableDateKey: { $gte: period.periodStartKey, $lte: period.periodEndKey } },
    ],
  }).lean();

  const attendanceByEmp = new Map();
  for (const att of approvedAttendance) {
    const id = String(att.employeeId);
    if (!attendanceByEmp.has(id)) attendanceByEmp.set(id, []);
    attendanceByEmp.get(id).push(att);
  }

  const adjustmentsByEmp = new Map();
  for (const adj of pendingAdjustments) {
    const id = String(adj.employeeId);
    if (!adjustmentsByEmp.has(id)) adjustmentsByEmp.set(id, []);
    adjustmentsByEmp.get(id).push(adj);
  }

  const eligibleEmployees = freqEmployees.filter(
    (emp) =>
      emp.status === EMPLOYEE_STATUS.ACTIVE ||
      attendanceByEmp.has(String(emp._id)) ||
      adjustmentsByEmp.has(String(emp._id))
  );

  // Also verify if an employee switched frequency later, check payrollFrequencyEffectiveFrom:
  // Any employee whose current frequency matches is included; if empty, still create empty draft preview or notify cleanly.
  const payrollCode = `PAY-${frequency === 'WEEKLY' ? 'WK' : 'MO'}-${period.periodKey.replace(/_TO_/g, '-')}`;

  let payroll = existing;
  if (!payroll) {
    payroll = await Payroll.create({
      payrollCode,
      frequency,
      periodKey: period.periodKey,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      periodStartKey: period.periodStartKey,
      periodEndKey: period.periodEndKey,
      status: PAYROLL_STATUS.DRAFT_PREVIEW,
      generatedBy: actor._id,
    });
  } else {
    payroll.generatedBy = actor._id;
    await PayrollItem.deleteMany({ payrollId: payroll._id, isFinalized: false });
  }

  const itemsToInsert = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const emp of eligibleEmployees) {
    if (!freqEmployeeIds.has(String(emp._id))) continue;
    const structure = await resolveSalaryStructureForPeriod(
      emp._id,
      period.periodStart,
      period.periodEnd
    );
    const empAtt = attendanceByEmp.get(String(emp._id)) || [];
    const empAdj = adjustmentsByEmp.get(String(emp._id)) || [];

    const calc = calculateEmployeePayroll({
      employee: emp,
      salaryStructure: structure,
      period,
      attendanceRecords: empAtt,
      adjustments: empAdj,
      companyConfig,
    });

    totalGross = round2(totalGross + calc.earnings.grossEarnings);
    totalDeductions = round2(totalDeductions + calc.deductions.totalDeductions);
    totalNet = round2(totalNet + calc.netPayable);

    itemsToInsert.push({
      payrollId: payroll._id,
      ...calc,
      isFinalized: false,
    });
  }

  if (itemsToInsert.length) {
    await PayrollItem.insertMany(itemsToInsert);
  }

  payroll.totals = {
    employeeCount: itemsToInsert.length,
    grossEarnings: totalGross,
    totalDeductions,
    netPayable: totalNet,
  };
  await payroll.save();

  await recordAudit({
    actor,
    action: 'PAYROLL_PREVIEW_GENERATED',
    entityType: 'Payroll',
    entityId: payroll._id,
    newData: {
      payrollCode: payroll.payrollCode,
      frequency,
      periodKey: period.periodKey,
      totals: payroll.totals,
    },
    ipAddress,
  });

  if (itemsToInsert.length > 0) {
    await notifyRoles([ROLES.OWNER], {
      type: 'PAYROLL_READY',
      title: 'Payroll Preview Ready',
      message: `${frequency} payroll preview ${payroll.payrollCode} generated for ${itemsToInsert.length} employee(s).`,
      entityType: 'Payroll',
      entityId: payroll._id,
    });
  }

  const items = await PayrollItem.find({ payrollId: payroll._id }).sort({
    'employeeSnapshot.employeeCode': 1,
  });

  return { payroll, items };
}

export async function finalizePayroll({ payrollId, actor, ipAddress }) {
  const result = await runWithTransaction(async (session) => {
    const queryOpts = session ? { session } : {};

    const payroll = await Payroll.findById(payrollId, null, queryOpts);
    if (!payroll) throw new AppError('Payroll not found', 404);
    if (payroll.status === PAYROLL_STATUS.FINALIZED) {
      throw new AppError('Payroll is already finalized and cannot be modified', 409);
    }

    const items = await PayrollItem.find({ payrollId: payroll._id }, null, queryOpts);
    if (!items.length) {
      throw new AppError('Cannot finalize an empty payroll with zero employees', 400);
    }

    const allAttendanceIds = [];
    const allAdjustmentIds = [];

    for (const item of items) {
      for (const aId of item.attendanceIds) allAttendanceIds.push(aId);
      for (const adjId of item.adjustmentIds) allAdjustmentIds.push(adjId);
    }

    if (allAttendanceIds.length) {
      const attUpdate = await Attendance.updateMany(
        {
          _id: { $in: allAttendanceIds },
          approvalStatus: ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED,
          payrollId: null,
        },
        {
          $set: {
            approvalStatus: ATTENDANCE_APPROVAL_STATUS.LOCKED_IN_PAYROLL,
            eligibleForPayroll: false,
            payrollId: payroll._id,
          },
        },
        queryOpts
      );

      if (attUpdate.modifiedCount !== allAttendanceIds.length) {
        throw new AppError(
          'One or more attendance records were modified or already locked by another payroll. Regenerate preview before finalizing.',
          409
        );
      }
    }

    if (allAdjustmentIds.length) {
      const adjPreCount = await SalaryAdjustment.countDocuments(
        {
          _id: { $in: allAdjustmentIds },
          inclusionStatus: {
            $in: [ADJUSTMENT_INCLUSION_STATUS.PENDING, ADJUSTMENT_INCLUSION_STATUS.RESERVED],
          },
          payrollId: null,
        },
        queryOpts
      );

      if (adjPreCount !== allAdjustmentIds.length) {
        throw new AppError(
          'One or more salary adjustments are already included in another payroll. Regenerate preview before finalizing.',
          409
        );
      }
    }

    // Lock items + assign immutable payslip numbers + bind adjustments to each PayrollItem
    for (const item of items) {
      item.payslipNumber = `PS-${payroll.periodKey.replace(/_TO_/g, '-')}-${item.employeeSnapshot.employeeCode}`;
      item.isFinalized = true;
      await item.save(queryOpts);

      if (item.adjustmentIds.length) {
        await SalaryAdjustment.updateMany(
          { _id: { $in: item.adjustmentIds }, payrollId: null },
          {
            $set: {
              inclusionStatus: ADJUSTMENT_INCLUSION_STATUS.LOCKED_IN_PAYROLL,
              payrollId: payroll._id,
              payrollItemId: item._id,
            },
          },
          queryOpts
        );
      }
    }

    payroll.status = PAYROLL_STATUS.FINALIZED;
    payroll.finalizedBy = actor._id;
    payroll.finalizedAt = new Date();
    await payroll.save(queryOpts);

    await recordAudit(
      {
        actor,
        action: 'PAYROLL_FINALIZED',
        entityType: 'Payroll',
        entityId: payroll._id,
        previousData: { status: PAYROLL_STATUS.DRAFT_PREVIEW },
        newData: { status: PAYROLL_STATUS.FINALIZED, totals: payroll.totals },
        ipAddress,
      },
      session
    );

    return { payroll, items };
  });

  await notifyRoles([ROLES.OWNER], {
    type: 'PAYROLL_FINALIZED',
    title: 'Payroll Finalized',
    message: `Payroll ${result.payroll.payrollCode} finalized (${result.items.length} payslips generated).`,
    entityType: 'Payroll',
    entityId: result.payroll._id,
  });

  return result;
}
