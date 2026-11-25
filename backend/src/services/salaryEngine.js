import {
  ADJUSTMENT_TYPE,
  ATTENDANCE_STATUS,
  LEAVE_PAID_TYPE,
  SALARY_TYPES,
} from '../constants/enums.js';

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Pure salary calculation function for one employee over one payroll period.
 * Monthly fixed salaries divide automatically by actual calendar days in the period (28-31).
 * Weekly fixed salaries divide automatically by 7 days.
 * Daily wage pays directly per worked/paid-leave/half-day unit.
 */
export function calculateEmployeePayroll({
  employee,
  salaryStructure,
  period,
  attendanceRecords = [],
  adjustments = [],
  companyConfig = {},
}) {
  const warnings = [];

  if (!salaryStructure) {
    warnings.push('No active salary structure configured for this period.');
  }

  const salaryType =
    salaryStructure?.salaryType ||
    (employee.payrollFrequency === 'WEEKLY' ? SALARY_TYPES.FIXED_WEEKLY : SALARY_TYPES.FIXED_MONTHLY);
  const baseAmount = Number(salaryStructure?.amount || 0);

  let periodDivisorDays = period.totalDays;
  if (salaryType === SALARY_TYPES.FIXED_WEEKLY) {
    periodDivisorDays = 7;
  } else if (salaryType === SALARY_TYPES.DAILY_WAGE) {
    periodDivisorDays = 1;
  }

  const perDayRate =
    salaryType === SALARY_TYPES.DAILY_WAGE
      ? round2(baseAmount)
      : round2(periodDivisorDays > 0 ? baseAmount / periodDivisorDays : 0);

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let holidayDays = 0;

  for (const rec of attendanceRecords) {
    switch (rec.status) {
      case ATTENDANCE_STATUS.PRESENT:
        presentDays += 1;
        break;
      case ATTENDANCE_STATUS.ABSENT:
        absentDays += 1;
        break;
      case ATTENDANCE_STATUS.HALF_DAY:
        halfDays += 1;
        break;
      case ATTENDANCE_STATUS.HOLIDAY:
        holidayDays += 1;
        break;
      case ATTENDANCE_STATUS.LEAVE:
        if (rec.leavePaidType === LEAVE_PAID_TYPE.PAID) {
          paidLeaveDays += 1;
        } else {
          unpaidLeaveDays += 1;
        }
        break;
      default:
        break;
    }
  }

  const recordedDays = attendanceRecords.length;
  if (recordedDays === 0) {
    warnings.push('No owner-approved attendance records found in this period.');
  } else if (recordedDays < period.totalDays) {
    warnings.push(
      `Only ${recordedDays} of ${period.totalDays} days have owner-approved attendance.`
    );
  }

  let payableDays = 0;
  let fixedSalaryComponent = 0;
  let absentDeduction = 0;
  let halfDayDeduction = 0;
  let unpaidLeaveDeduction = 0;

  if (salaryType === SALARY_TYPES.DAILY_WAGE) {
    payableDays = round2(presentDays + paidLeaveDays + halfDays * 0.5);
    fixedSalaryComponent = round2(payableDays * perDayRate);
  } else {
    payableDays = round2(presentDays + paidLeaveDays + holidayDays + halfDays * 0.5);
    fixedSalaryComponent = round2(baseAmount);
    absentDeduction = round2(absentDays * perDayRate);
    halfDayDeduction = round2(halfDays * 0.5 * perDayRate);
    unpaidLeaveDeduction = round2(unpaidLeaveDays * perDayRate);
  }

  const earningAdjustments = [];
  const deductionAdjustments = [];
  let totalOtherEarnings = 0;
  let totalOtherDeductions = 0;

  for (const adj of adjustments) {
    const snap = {
      adjustmentId: adj._id,
      adjustmentCode: adj.adjustmentCode,
      category: adj.category,
      name: adj.name,
      amount: round2(adj.amount),
      stage: adj.stage,
      applicableDateKey: adj.applicableDateKey,
    };

    if (adj.type === ADJUSTMENT_TYPE.EARNING) {
      earningAdjustments.push(snap);
      totalOtherEarnings = round2(totalOtherEarnings + snap.amount);
    } else {
      deductionAdjustments.push(snap);
      totalOtherDeductions = round2(totalOtherDeductions + snap.amount);
    }
  }

  const grossEarnings = round2(fixedSalaryComponent + totalOtherEarnings);
  const totalDeductions = round2(
    absentDeduction + halfDayDeduction + unpaidLeaveDeduction + totalOtherDeductions
  );
  const netPayable = round2(Math.max(0, grossEarnings - totalDeductions));

  if (grossEarnings < totalDeductions) {
    warnings.push('Total deductions exceed gross earnings; net payable clamped to 0.');
  }

  return {
    employeeId: employee._id,
    companySnapshot: {
      companyName: companyConfig.companyName || 'V-Bus Transport Operations',
      companyAddress:
        companyConfig.companyAddress || 'Central Depot, Main Highway Road, Transport Nagar',
      companyLogoText: companyConfig.companyLogoText || 'V-BUS',
      currencySymbol: companyConfig.currencySymbol || '₹',
    },
    employeeSnapshot: {
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      employeeType: employee.employeeType,
      payrollFrequency: employee.payrollFrequency,
      mobile: employee.mobile || '',
    },
    salaryStructureSnapshot: {
      salaryStructureId: salaryStructure?._id || null,
      salaryType,
      baseAmount: round2(baseAmount),
      periodDivisorDays,
      perDayRate,
      effectiveFrom: salaryStructure?.effectiveFrom || null,
    },
    attendanceSummary: {
      totalPeriodDays: period.totalDays,
      recordedDays,
      presentDays,
      absentDays,
      halfDays,
      paidLeaveDays,
      unpaidLeaveDays,
      holidayDays,
      payableDays,
    },
    earnings: {
      fixedSalaryComponent,
      adjustments: earningAdjustments,
      totalAdjustments: totalOtherEarnings,
      grossEarnings,
    },
    deductions: {
      absentDeduction,
      halfDayDeduction,
      unpaidLeaveDeduction,
      adjustments: deductionAdjustments,
      totalOtherDeductions,
      totalDeductions,
    },
    netPayable,
    attendanceIds: attendanceRecords.map((a) => a._id),
    adjustmentIds: adjustments.map((a) => a._id),
    warnings,
  };
}
