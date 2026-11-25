import { ADJUSTMENT_INCLUSION_STATUS, PAYROLL_FREQUENCY } from '../constants/enums.js';
import { Employee } from '../models/Employee.js';
import { SalaryAdjustment } from '../models/SalaryAdjustment.js';
import { recordAudit } from '../services/auditService.js';
import { getMonthlyPeriodKeyFromDateKey, getWeekPeriodFromStart, toDateKey } from '../utils/dates.js';
import { AppError, asyncHandler } from '../utils/errors.js';

async function nextAdjustmentCode() {
  const count = await SalaryAdjustment.countDocuments();
  return `ADJ-${String(count + 1).padStart(5, '0')}`;
}

export const listAdjustments = asyncHandler(async (req, res) => {
  const { employeeId, inclusionStatus, stage, periodKey, type } = req.query;
  const filter = {};
  if (employeeId) filter.employeeId = employeeId;
  if (inclusionStatus) filter.inclusionStatus = inclusionStatus;
  if (stage) filter.stage = stage;
  if (periodKey) filter.periodKey = periodKey;
  if (type) filter.type = type;

  const adjustments = await SalaryAdjustment.find(filter)
    .populate('employeeId', 'employeeCode fullName employeeType payrollFrequency')
    .populate('addedBy', 'name role')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ success: true, adjustments });
});

export const createAdjustment = asyncHandler(async (req, res) => {
  const {
    employeeId,
    stage,
    category,
    name,
    type,
    amount,
    description,
    applicableDate,
    attendanceId,
    weekStartKey,
  } = req.body;

  const emp = await Employee.findOne({ _id: employeeId, isDeleted: false }).lean();
  if (!emp) throw new AppError('Employee not found', 404);

  const dateKey = toDateKey(applicableDate);
  const periodType = emp.payrollFrequency;

  let periodKey;
  if (periodType === PAYROLL_FREQUENCY.MONTHLY) {
    periodKey = getMonthlyPeriodKeyFromDateKey(dateKey);
  } else if (weekStartKey) {
    periodKey = getWeekPeriodFromStart(weekStartKey).periodKey;
  } else {
    // Compute Monday-Sunday or Sunday-Saturday? Use dateKey's week or exact date match in payrollService
    // Note: payrollService also matches by applicableDateKey inside [periodStartKey, periodEndKey],
    // so setting periodKey to dateKey or week range works seamlessly.
    periodKey = dateKey;
  }

  const adjustmentCode = await nextAdjustmentCode();
  const adjustment = await SalaryAdjustment.create({
    adjustmentCode,
    employeeId: emp._id,
    stage,
    category,
    name,
    type,
    amount: Number(amount),
    description: description || '',
    applicableDateKey: dateKey,
    attendanceId: attendanceId || null,
    periodType,
    periodKey,
    inclusionStatus: ADJUSTMENT_INCLUSION_STATUS.PENDING,
    addedBy: req.user._id,
  });

  await recordAudit({
    actor: req.user,
    action: 'SALARY_ADJUSTMENT_CREATED',
    entityType: 'SalaryAdjustment',
    entityId: adjustment._id,
    newData: {
      adjustmentCode,
      employeeCode: emp.employeeCode,
      name,
      type,
      amount,
      stage,
      applicableDateKey: dateKey,
    },
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, adjustment });
});

export const deleteAdjustment = asyncHandler(async (req, res) => {
  const adj = await SalaryAdjustment.findById(req.params.id);
  if (!adj) throw new AppError('Adjustment not found', 404);

  if (adj.inclusionStatus === ADJUSTMENT_INCLUSION_STATUS.LOCKED_IN_PAYROLL) {
    throw new AppError('Cannot delete an adjustment already locked in a finalized payroll', 409);
  }

  adj.inclusionStatus = ADJUSTMENT_INCLUSION_STATUS.CANCELLED;
  await adj.save();

  await recordAudit({
    actor: req.user,
    action: 'SALARY_ADJUSTMENT_CANCELLED',
    entityType: 'SalaryAdjustment',
    entityId: adj._id,
    previousData: { inclusionStatus: ADJUSTMENT_INCLUSION_STATUS.PENDING },
    newData: { inclusionStatus: ADJUSTMENT_INCLUSION_STATUS.CANCELLED },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Adjustment cancelled' });
});
