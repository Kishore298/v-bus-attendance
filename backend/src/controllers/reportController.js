import { ATTENDANCE_APPROVAL_STATUS, PAYROLL_STATUS, ROLES } from '../constants/enums.js';
import { Attendance } from '../models/Attendance.js';
import { AttendanceBatch } from '../models/AttendanceBatch.js';
import { Employee } from '../models/Employee.js';
import { Payroll } from '../models/Payroll.js';
import { PayrollItem } from '../models/PayrollItem.js';
import { SalaryAdjustment } from '../models/SalaryAdjustment.js';
import { buildCsv } from '../utils/csv.js';
import { asyncHandler } from '../utils/errors.js';

export const getAttendanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, employeeType, employeeId, approvalStatus, format } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.attendanceDateKey = {};
    if (startDate) filter.attendanceDateKey.$gte = startDate;
    if (endDate) filter.attendanceDateKey.$lte = endDate;
  }
  if (employeeId) filter.employeeId = employeeId;
  if (approvalStatus) filter.approvalStatus = approvalStatus;

  if (employeeType) {
    const emps = await Employee.find({ employeeType }).select('_id').lean();
    filter.employeeId = { $in: emps.map((e) => e._id) };
  }

  if (req.user.role === ROLES.SUB_SUPERVISOR) {
    const myBatches = await AttendanceBatch.find({ submittedBy: req.user._id })
      .select('_id')
      .lean();
    filter.batchId = { $in: myBatches.map((b) => b._id) };
  }

  const records = await Attendance.find(filter)
    .populate('employeeId', 'employeeCode fullName employeeType')
    .populate('batchId', 'batchCode')
    .sort({ attendanceDateKey: -1 })
    .limit(1000)
    .lean();

  const rows = records.map((r) => ({
    date: r.attendanceDateKey,
    batchCode: r.batchId?.batchCode || '',
    employeeCode: r.employeeId?.employeeCode || '',
    fullName: r.employeeId?.fullName || '',
    employeeType: r.employeeId?.employeeType || '',
    status: r.status,
    leavePaidType: r.leavePaidType,
    approvalStatus: r.approvalStatus,
    reason: r.ownerReason || r.supervisorReason || '',
    notes: r.notes || '',
  }));

  if (format === 'csv') {
    const csv = buildCsv(rows, [
      'date',
      'batchCode',
      'employeeCode',
      'fullName',
      'employeeType',
      'status',
      'leavePaidType',
      'approvalStatus',
      'reason',
      'notes',
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    return res.send(csv);
  }

  res.json({ success: true, rows });
});

export const getSupervisorReviewReport = asyncHandler(async (req, res) => {
  const { outcome, format } = req.query;
  const filter = {};
  if (outcome === 'APPROVED') {
    filter.approvalStatus = {
      $in: [
        ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED,
        ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED,
        ATTENDANCE_APPROVAL_STATUS.LOCKED_IN_PAYROLL,
      ],
    };
  } else if (outcome === 'FLAGGED') {
    filter.approvalStatus = ATTENDANCE_APPROVAL_STATUS.FLAGGED_BY_SUPERVISOR;
  } else if (outcome === 'REJECTED') {
    filter.approvalStatus = ATTENDANCE_APPROVAL_STATUS.RETURNED_TO_SUB_SUPERVISOR;
  } else {
    filter.supervisorActionAt = { $ne: null };
  }

  const records = await Attendance.find(filter)
    .populate('employeeId', 'employeeCode fullName employeeType')
    .populate('supervisorActionBy', 'name')
    .sort({ supervisorActionAt: -1 })
    .limit(500)
    .lean();

  const rows = records.map((r) => ({
    date: r.attendanceDateKey,
    employeeCode: r.employeeId?.employeeCode || '',
    fullName: r.employeeId?.fullName || '',
    employeeType: r.employeeId?.employeeType || '',
    attendanceStatus: r.status,
    approvalStatus: r.approvalStatus,
    supervisor: r.supervisorActionBy?.name || '',
    supervisorReason: r.supervisorReason || '',
  }));

  if (format === 'csv') {
    const csv = buildCsv(rows, [
      'date',
      'employeeCode',
      'fullName',
      'employeeType',
      'attendanceStatus',
      'approvalStatus',
      'supervisor',
      'supervisorReason',
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="supervisor-review-report.csv"');
    return res.send(csv);
  }

  res.json({ success: true, rows });
});

export const getPayrollReport = asyncHandler(async (req, res) => {
  const { frequency, format } = req.query;
  const payrollFilter = { status: PAYROLL_STATUS.FINALIZED };
  if (frequency) payrollFilter.frequency = frequency;

  const payrolls = await Payroll.find(payrollFilter).sort({ periodEnd: -1 }).lean();
  const payrollIds = payrolls.map((p) => p._id);

  const items = await PayrollItem.find({ payrollId: { $in: payrollIds } })
    .populate('payrollId', 'payrollCode frequency periodKey periodStartKey periodEndKey')
    .sort({ createdAt: -1 })
    .lean();

  const rows = items.map((i) => ({
    payrollCode: i.payrollId?.payrollCode || '',
    frequency: i.payrollId?.frequency || '',
    periodKey: i.payrollId?.periodKey || '',
    payslipNumber: i.payslipNumber || '',
    employeeCode: i.employeeSnapshot?.employeeCode || '',
    fullName: i.employeeSnapshot?.fullName || '',
    employeeType: i.employeeSnapshot?.employeeType || '',
    payableDays: i.attendanceSummary?.payableDays || 0,
    grossEarnings: i.earnings?.grossEarnings || 0,
    totalDeductions: i.deductions?.totalDeductions || 0,
    netPayable: i.netPayable || 0,
  }));

  if (format === 'csv') {
    const csv = buildCsv(rows, [
      'payrollCode',
      'frequency',
      'periodKey',
      'payslipNumber',
      'employeeCode',
      'fullName',
      'employeeType',
      'payableDays',
      'grossEarnings',
      'totalDeductions',
      'netPayable',
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payroll-report.csv"');
    return res.send(csv);
  }

  res.json({ success: true, payrolls, rows });
});

export const getAdjustmentsReport = asyncHandler(async (req, res) => {
  const { type, format } = req.query;
  const filter = { inclusionStatus: { $ne: 'CANCELLED' } };
  if (type) filter.type = type;

  const list = await SalaryAdjustment.find(filter)
    .populate('employeeId', 'employeeCode fullName employeeType')
    .sort({ applicableDateKey: -1 })
    .lean();

  const rows = list.map((a) => ({
    adjustmentCode: a.adjustmentCode,
    applicableDate: a.applicableDateKey,
    employeeCode: a.employeeId?.employeeCode || '',
    fullName: a.employeeId?.fullName || '',
    type: a.type,
    category: a.category,
    name: a.name,
    amount: a.amount,
    stage: a.stage,
    inclusionStatus: a.inclusionStatus,
  }));

  if (format === 'csv') {
    const csv = buildCsv(rows, [
      'adjustmentCode',
      'applicableDate',
      'employeeCode',
      'fullName',
      'type',
      'category',
      'name',
      'amount',
      'stage',
      'inclusionStatus',
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="adjustments-report.csv"');
    return res.send(csv);
  }

  res.json({ success: true, rows });
});
