import { describe, expect, it } from 'vitest';
import {
  ADJUSTMENT_STAGE,
  ADJUSTMENT_TYPE,
  ATTENDANCE_STATUS,
  LEAVE_PAID_TYPE,
  PAYROLL_FREQUENCY,
  SALARY_TYPES,
} from '../src/constants/enums.js';
import { calculateEmployeePayroll } from '../src/services/salaryEngine.js';
import { getMonthPeriod, getWeekPeriodFromStart } from '../src/utils/dates.js';

describe('Salary Calculation Engine', () => {
  const baseEmployee = {
    _id: 'emp1',
    employeeCode: 'DRV-0001',
    fullName: 'Rajesh Sharma',
    employeeType: 'DRIVER',
    payrollFrequency: PAYROLL_FREQUENCY.MONTHLY,
  };

  it('uses actual calendar days for monthly salary (28 days in Feb vs 31 days in Mar)', () => {
    const feb = getMonthPeriod(2026, 2); // 28 days
    const mar = getMonthPeriod(2026, 3); // 31 days
    const structure = { _id: 's1', salaryType: SALARY_TYPES.FIXED_MONTHLY, amount: 28000 };

    const febResult = calculateEmployeePayroll({
      employee: baseEmployee,
      salaryStructure: structure,
      period: feb,
      attendanceRecords: [
        { _id: 'a1', status: ATTENDANCE_STATUS.ABSENT, leavePaidType: LEAVE_PAID_TYPE.NONE },
      ],
      adjustments: [],
    });

    // 28000 / 28 = 1000/day -> 1 absent day = 1000 deduction -> net 27000
    expect(febResult.salaryStructureSnapshot.periodDivisorDays).toBe(28);
    expect(febResult.salaryStructureSnapshot.perDayRate).toBe(1000);
    expect(febResult.deductions.absentDeduction).toBe(1000);
    expect(febResult.netPayable).toBe(27000);

    const marResult = calculateEmployeePayroll({
      employee: baseEmployee,
      salaryStructure: structure,
      period: mar,
      attendanceRecords: [
        { _id: 'a2', status: ATTENDANCE_STATUS.ABSENT, leavePaidType: LEAVE_PAID_TYPE.NONE },
      ],
      adjustments: [],
    });

    expect(marResult.salaryStructureSnapshot.periodDivisorDays).toBe(31);
    expect(marResult.salaryStructureSnapshot.perDayRate).toBe(903.23);
    expect(marResult.deductions.absentDeduction).toBe(903.23);
  });

  it('handles half days, paid vs unpaid leaves, and earnings/deduction adjustments accurately', () => {
    const nov = getMonthPeriod(2026, 11); // 30 days
    const structure = { _id: 's2', salaryType: SALARY_TYPES.FIXED_MONTHLY, amount: 18000 }; // 600/day

    const result = calculateEmployeePayroll({
      employee: baseEmployee,
      salaryStructure: structure,
      period: nov,
      attendanceRecords: [
        { _id: '1', status: ATTENDANCE_STATUS.PRESENT, leavePaidType: LEAVE_PAID_TYPE.NONE },
        { _id: '2', status: ATTENDANCE_STATUS.HALF_DAY, leavePaidType: LEAVE_PAID_TYPE.NONE },
        { _id: '3', status: ATTENDANCE_STATUS.LEAVE, leavePaidType: LEAVE_PAID_TYPE.PAID },
        { _id: '4', status: ATTENDANCE_STATUS.LEAVE, leavePaidType: LEAVE_PAID_TYPE.UNPAID },
      ],
      adjustments: [
        {
          _id: 'adj1',
          adjustmentCode: 'ADJ-0001',
          category: 'MILEAGE',
          name: 'Highway Mileage',
          type: ADJUSTMENT_TYPE.EARNING,
          amount: 750,
          stage: ADJUSTMENT_STAGE.ATTENDANCE_APPROVAL,
          applicableDateKey: '2026-11-05',
        },
        {
          _id: 'adj2',
          adjustmentCode: 'ADJ-0002',
          category: 'ADVANCE_DEDUCTION',
          name: 'Salary Advance',
          type: ADJUSTMENT_TYPE.DEDUCTION,
          amount: 1000,
          stage: ADJUSTMENT_STAGE.PAYROLL_PROCESSING,
          applicableDateKey: '2026-11-10',
        },
      ],
    });

    expect(result.attendanceSummary.payableDays).toBe(2.5); // 1 present + 1 paid leave + 0.5 half
    expect(result.earnings.grossEarnings).toBe(18750);
    expect(result.deductions.halfDayDeduction).toBe(300);
    expect(result.deductions.unpaidLeaveDeduction).toBe(600);
    expect(result.deductions.totalOtherDeductions).toBe(1000);
    expect(result.deductions.totalDeductions).toBe(1900);
    expect(result.netPayable).toBe(16850);
  });

  it('calculates daily wage and weekly fixed salaries cleanly', () => {
    const week = getWeekPeriodFromStart('2026-11-16');
    const dailyEmp = { ...baseEmployee, payrollFrequency: PAYROLL_FREQUENCY.WEEKLY };
    const dailyRes = calculateEmployeePayroll({
      employee: dailyEmp,
      salaryStructure: { _id: 's3', salaryType: SALARY_TYPES.DAILY_WAGE, amount: 600 },
      period: week,
      attendanceRecords: [
        { _id: '1', status: ATTENDANCE_STATUS.PRESENT },
        { _id: '2', status: ATTENDANCE_STATUS.PRESENT },
        { _id: '3', status: ATTENDANCE_STATUS.HALF_DAY },
        { _id: '4', status: ATTENDANCE_STATUS.ABSENT },
      ],
      adjustments: [],
    });

    expect(dailyRes.attendanceSummary.payableDays).toBe(2.5);
    expect(dailyRes.earnings.fixedSalaryComponent).toBe(1500);
    expect(dailyRes.deductions.absentDeduction).toBe(0);
    expect(dailyRes.netPayable).toBe(1500);
  });
});
