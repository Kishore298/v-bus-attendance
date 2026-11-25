import {
  ADJUSTMENT_INCLUSION_STATUS,
  ADJUSTMENT_TYPE,
  ATTENDANCE_APPROVAL_STATUS,
  ATTENDANCE_STATUS,
  BATCH_STATUS,
  EMPLOYEE_STATUS,
  EMPLOYEE_TYPES,
  PAYROLL_FREQUENCY,
  PAYROLL_STATUS,
} from '../constants/enums.js';
import { Attendance } from '../models/Attendance.js';
import { AttendanceBatch } from '../models/AttendanceBatch.js';
import { Employee } from '../models/Employee.js';
import { Payroll } from '../models/Payroll.js';
import { SalaryAdjustment } from '../models/SalaryAdjustment.js';
import { toDateKey } from '../utils/dates.js';
import { asyncHandler } from '../utils/errors.js';
import { sanitizeEmployeePopulatedField } from '../utils/projections.js';

async function getTodayAttendanceSummary(todayKey) {
  const todayRecords = await Attendance.find({ attendanceDateKey: todayKey }).lean();
  const summary = {
    dateKey: todayKey,
    totalMarked: todayRecords.length,
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    holiday: 0,
  };
  for (const r of todayRecords) {
    if (r.status === ATTENDANCE_STATUS.PRESENT) summary.present += 1;
    else if (r.status === ATTENDANCE_STATUS.ABSENT) summary.absent += 1;
    else if (r.status === ATTENDANCE_STATUS.HALF_DAY) summary.halfDay += 1;
    else if (r.status === ATTENDANCE_STATUS.LEAVE) summary.leave += 1;
    else if (r.status === ATTENDANCE_STATUS.HOLIDAY) summary.holiday += 1;
  }
  return summary;
}

export const getSubSupervisorDashboard = asyncHandler(async (req, res) => {
  const todayKey = toDateKey(new Date());

  const [activeDrivers, activeCleaners, todaySummary, draftBatches, submittedBatches, rejectedRecords, recentBatches] =
    await Promise.all([
      Employee.countDocuments({
        isDeleted: false,
        status: EMPLOYEE_STATUS.ACTIVE,
        employeeType: EMPLOYEE_TYPES.DRIVER,
      }),
      Employee.countDocuments({
        isDeleted: false,
        status: EMPLOYEE_STATUS.ACTIVE,
        employeeType: EMPLOYEE_TYPES.CLEANER,
      }),
      getTodayAttendanceSummary(todayKey),
      AttendanceBatch.countDocuments({
        submittedBy: req.user._id,
        status: BATCH_STATUS.DRAFT,
      }),
      AttendanceBatch.countDocuments({
        submittedBy: req.user._id,
        status: { $ne: BATCH_STATUS.DRAFT },
      }),
      Attendance.find({
        approvalStatus: {
          $in: [
            ATTENDANCE_APPROVAL_STATUS.RETURNED_TO_SUB_SUPERVISOR,
            ATTENDANCE_APPROVAL_STATUS.RETURNED_BY_OWNER,
            ATTENDANCE_APPROVAL_STATUS.FLAGGED_BY_SUPERVISOR,
          ],
        },
      })
        .populate('employeeId', 'employeeCode fullName employeeType status')
        .sort({ attendanceDateKey: -1 })
        .limit(10)
        .lean(),
      AttendanceBatch.find({ submittedBy: req.user._id })
        .sort({ attendanceDateKey: -1, createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

  // Strictly NO financial fields
  res.json({
    success: true,
    dashboard: {
      activeDrivers,
      activeCleaners,
      todaySummary,
      pendingSubmissionCount: draftBatches,
      submittedBatchCount: submittedBatches,
      rejectedOrFlaggedCount: rejectedRecords.length,
      rejectedRecords: rejectedRecords.map((r) => ({
        ...r,
        employeeId: sanitizeEmployeePopulatedField(r.employeeId, req.user.role),
      })),
      recentBatches,
    },
  });
});

export const getSupervisorDashboard = asyncHandler(async (req, res) => {
  const todayKey = toDateKey(new Date());

  const [
    totalActiveEmployees,
    todaySummary,
    pendingBatchesCount,
    approvedAttendanceCount,
    flaggedCount,
    rejectedCount,
    pendingBatches,
    recentHistory,
  ] = await Promise.all([
    Employee.countDocuments({ isDeleted: false, status: EMPLOYEE_STATUS.ACTIVE }),
    getTodayAttendanceSummary(todayKey),
    AttendanceBatch.countDocuments({
      status: {
        $in: [BATCH_STATUS.SUBMITTED_TO_SUPERVISOR, BATCH_STATUS.SUPERVISOR_PARTIAL_REVIEW],
      },
    }),
    Attendance.countDocuments({
      approvalStatus: {
        $in: [
          ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED,
          ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED,
          ATTENDANCE_APPROVAL_STATUS.LOCKED_IN_PAYROLL,
        ],
      },
    }),
    Attendance.countDocuments({
      approvalStatus: ATTENDANCE_APPROVAL_STATUS.FLAGGED_BY_SUPERVISOR,
    }),
    Attendance.countDocuments({
      approvalStatus: ATTENDANCE_APPROVAL_STATUS.RETURNED_TO_SUB_SUPERVISOR,
    }),
    AttendanceBatch.find({
      status: {
        $in: [BATCH_STATUS.SUBMITTED_TO_SUPERVISOR, BATCH_STATUS.SUPERVISOR_PARTIAL_REVIEW],
      },
    })
      .populate('submittedBy', 'name')
      .sort({ attendanceDateKey: -1 })
      .limit(10)
      .lean(),
    AttendanceBatch.find({ supervisorReviewedBy: { $ne: null } })
      .populate('submittedBy', 'name')
      .sort({ supervisorReviewedAt: -1 })
      .limit(10)
      .lean(),
  ]);

  res.json({
    success: true,
    dashboard: {
      totalActiveEmployees,
      todaySummary,
      pendingBatchesCount,
      approvedAttendanceCount,
      flaggedCount,
      rejectedCount,
      pendingBatches,
      recentHistory,
    },
  });
});

export const getOwnerDashboard = asyncHandler(async (req, res) => {
  const todayKey = toDateKey(new Date());

  const [
    totalActiveEmployees,
    totalDrivers,
    totalCleaners,
    todaySummary,
    pendingSupervisorApprovals,
    pendingOwnerApprovals,
    recentPayrolls,
    finalizedWeeklyPayrolls,
    finalizedMonthlyPayrolls,
    adjustmentStats,
  ] = await Promise.all([
    Employee.countDocuments({ isDeleted: false, status: EMPLOYEE_STATUS.ACTIVE }),
    Employee.countDocuments({
      isDeleted: false,
      status: EMPLOYEE_STATUS.ACTIVE,
      employeeType: EMPLOYEE_TYPES.DRIVER,
    }),
    Employee.countDocuments({
      isDeleted: false,
      status: EMPLOYEE_STATUS.ACTIVE,
      employeeType: EMPLOYEE_TYPES.CLEANER,
    }),
    getTodayAttendanceSummary(todayKey),
    AttendanceBatch.countDocuments({
      status: {
        $in: [BATCH_STATUS.SUBMITTED_TO_SUPERVISOR, BATCH_STATUS.SUPERVISOR_PARTIAL_REVIEW],
      },
    }),
    Attendance.countDocuments({
      approvalStatus: ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED,
    }),
    Payroll.find({}).sort({ createdAt: -1 }).limit(8).lean(),
    Payroll.find({ frequency: PAYROLL_FREQUENCY.WEEKLY, status: PAYROLL_STATUS.FINALIZED }).lean(),
    Payroll.find({ frequency: PAYROLL_FREQUENCY.MONTHLY, status: PAYROLL_STATUS.FINALIZED }).lean(),
    SalaryAdjustment.aggregate([
      { $match: { inclusionStatus: { $ne: ADJUSTMENT_INCLUSION_STATUS.CANCELLED } } },
      { $group: { _id: '$type', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const weeklyTotal = finalizedWeeklyPayrolls.reduce((s, p) => s + (p.totals?.netPayable || 0), 0);
  const monthlyTotal = finalizedMonthlyPayrolls.reduce((s, p) => s + (p.totals?.netPayable || 0), 0);

  const earningsAdj = adjustmentStats.find((a) => a._id === ADJUSTMENT_TYPE.EARNING) || {
    totalAmount: 0,
    count: 0,
  };
  const deductionsAdj = adjustmentStats.find((a) => a._id === ADJUSTMENT_TYPE.DEDUCTION) || {
    totalAmount: 0,
    count: 0,
  };

  res.json({
    success: true,
    dashboard: {
      totalActiveEmployees,
      totalDrivers,
      totalCleaners,
      todaySummary,
      pendingSupervisorApprovals,
      pendingOwnerApprovals,
      weeklyPayrollSummary: {
        finalizedCount: finalizedWeeklyPayrolls.length,
        totalNetPayable: weeklyTotal,
      },
      monthlyPayrollSummary: {
        finalizedCount: finalizedMonthlyPayrolls.length,
        totalNetPayable: monthlyTotal,
      },
      totalSalaryExpenditure: weeklyTotal + monthlyTotal,
      recentPayrolls,
      adjustmentsSummary: {
        benefitsTotal: earningsAdj.totalAmount,
        benefitsCount: earningsAdj.count,
        deductionsTotal: deductionsAdj.totalAmount,
        deductionsCount: deductionsAdj.count,
      },
    },
  });
});
