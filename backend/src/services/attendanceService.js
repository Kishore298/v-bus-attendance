import {
  ATTENDANCE_APPROVAL_STATUS,
  ATTENDANCE_STATUS,
  BATCH_STATUS,
  EMPLOYEE_TYPES,
  LEAVE_PAID_TYPE,
  ROLES,
} from '../constants/enums.js';
import { Attendance } from '../models/Attendance.js';
import { AttendanceBatch } from '../models/AttendanceBatch.js';
import { Employee } from '../models/Employee.js';
import { parseDateKeyStart, toDateKey } from '../utils/dates.js';
import { AppError } from '../utils/errors.js';
import { recordAudit } from './auditService.js';
import { notifyRoles, notifyUsers } from './notificationService.js';

export function computeBatchCounts(records, employeeMap) {
  const counts = {
    total: records.length,
    drivers: 0,
    cleaners: 0,
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    holiday: 0,
  };

  for (const r of records) {
    const emp = employeeMap.get(String(r.employeeId?._id || r.employeeId));
    if (emp?.employeeType === EMPLOYEE_TYPES.DRIVER) counts.drivers += 1;
    if (emp?.employeeType === EMPLOYEE_TYPES.CLEANER) counts.cleaners += 1;

    if (r.status === ATTENDANCE_STATUS.PRESENT) counts.present += 1;
    else if (r.status === ATTENDANCE_STATUS.ABSENT) counts.absent += 1;
    else if (r.status === ATTENDANCE_STATUS.HALF_DAY) counts.halfDay += 1;
    else if (r.status === ATTENDANCE_STATUS.LEAVE) counts.leave += 1;
    else if (r.status === ATTENDANCE_STATUS.HOLIDAY) counts.holiday += 1;
  }

  return counts;
}

export function deriveBatchStatusFromRecords(records) {
  if (!records.length) return BATCH_STATUS.DRAFT;
  const statuses = records.map((r) => r.approvalStatus);

  if (statuses.every((s) => s === ATTENDANCE_APPROVAL_STATUS.DRAFT)) {
    return BATCH_STATUS.DRAFT;
  }
  if (statuses.every((s) => s === ATTENDANCE_APPROVAL_STATUS.LOCKED_IN_PAYROLL)) {
    return BATCH_STATUS.LOCKED_IN_PAYROLL;
  }
  if (
    statuses.every(
      (s) =>
        s === ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED ||
        s === ATTENDANCE_APPROVAL_STATUS.LOCKED_IN_PAYROLL
    )
  ) {
    return BATCH_STATUS.OWNER_APPROVED;
  }
  if (
    statuses.some(
      (s) =>
        s === ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED ||
        s === ATTENDANCE_APPROVAL_STATUS.LOCKED_IN_PAYROLL
    )
  ) {
    return BATCH_STATUS.OWNER_PARTIAL_REVIEW;
  }
  if (statuses.every((s) => s === ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED)) {
    return BATCH_STATUS.SUPERVISOR_APPROVED;
  }
  if (
    statuses.some((s) => s === ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED) &&
    statuses.some(
      (s) =>
        s === ATTENDANCE_APPROVAL_STATUS.FLAGGED_BY_SUPERVISOR ||
        s === ATTENDANCE_APPROVAL_STATUS.RETURNED_TO_SUB_SUPERVISOR ||
        s === ATTENDANCE_APPROVAL_STATUS.RETURNED_BY_OWNER ||
        s === ATTENDANCE_APPROVAL_STATUS.SUBMITTED_TO_SUPERVISOR
    )
  ) {
    return BATCH_STATUS.SUPERVISOR_PARTIAL_REVIEW;
  }
  if (
    statuses.every(
      (s) =>
        s === ATTENDANCE_APPROVAL_STATUS.RETURNED_TO_SUB_SUPERVISOR ||
        s === ATTENDANCE_APPROVAL_STATUS.RETURNED_BY_OWNER
    )
  ) {
    return BATCH_STATUS.RETURNED_TO_SUB_SUPERVISOR;
  }
  return BATCH_STATUS.SUBMITTED_TO_SUPERVISOR;
}

export async function recomputeBatchState(batchId) {
  const records = await Attendance.find({ batchId }).lean();
  const empIds = records.map((r) => r.employeeId);
  const employees = await Employee.find({ _id: { $in: empIds } })
    .select('_id employeeType')
    .lean();
  const empMap = new Map(employees.map((e) => [String(e._id), e]));

  const counts = computeBatchCounts(records, empMap);
  const status = deriveBatchStatusFromRecords(records);

  return AttendanceBatch.findByIdAndUpdate(
    batchId,
    { $set: { counts, status } },
    { new: true }
  );
}

async function nextBatchCode(dateKey) {
  const count = await AttendanceBatch.countDocuments({ attendanceDateKey: dateKey });
  return `ATT-${dateKey}-${String(count + 1).padStart(2, '0')}`;
}

export async function createOrSaveBatch({ actor, attendanceDate, entries, submitNow, ipAddress }) {
  const dateKey = toDateKey(attendanceDate);
  const dateObj = parseDateKeyStart(dateKey);

  if (!entries.length) {
    throw new AppError('At least one employee attendance record is required', 400);
  }

  const seenEmployees = new Set();
  for (const entry of entries) {
    if (seenEmployees.has(entry.employeeId)) {
      throw new AppError('Duplicate employee entry inside the same batch payload', 400);
    }
    seenEmployees.add(entry.employeeId);
  }

  const employees = await Employee.find({
    _id: { $in: [...seenEmployees] },
    isDeleted: false,
    status: 'ACTIVE',
  })
    .select('_id employeeType fullName employeeCode')
    .lean();

  if (employees.length !== seenEmployees.size) {
    throw new AppError('One or more selected employees are inactive, deleted, or invalid', 400);
  }
  const empMap = new Map(employees.map((e) => [String(e._id), e]));

  const existingRecords = await Attendance.find({
    employeeId: { $in: [...seenEmployees] },
    attendanceDateKey: dateKey,
  }).lean();

  if (existingRecords.length > 0) {
    const dupCodes = existingRecords
      .map((r) => empMap.get(String(r.employeeId))?.employeeCode || String(r.employeeId))
      .join(', ');
    throw new AppError(
      `Attendance already exists on ${dateKey} for employee(s): ${dupCodes}`,
      409
    );
  }

  const batchCode = await nextBatchCode(dateKey);
  const initialApprovalStatus = submitNow
    ? ATTENDANCE_APPROVAL_STATUS.SUBMITTED_TO_SUPERVISOR
    : ATTENDANCE_APPROVAL_STATUS.DRAFT;

  const counts = computeBatchCounts(entries, empMap);

  const batch = await AttendanceBatch.create({
    batchCode,
    attendanceDateKey: dateKey,
    attendanceDate: dateObj,
    submittedBy: actor._id,
    submittedAt: submitNow ? new Date() : null,
    status: submitNow ? BATCH_STATUS.SUBMITTED_TO_SUPERVISOR : BATCH_STATUS.DRAFT,
    counts,
  });

  const docsToInsert = entries.map((entry) => ({
    batchId: batch._id,
    employeeId: entry.employeeId,
    attendanceDateKey: dateKey,
    attendanceDate: dateObj,
    status: entry.status,
    leavePaidType:
      entry.status === ATTENDANCE_STATUS.LEAVE
        ? entry.leavePaidType || LEAVE_PAID_TYPE.UNPAID
        : LEAVE_PAID_TYPE.NONE,
    notes: entry.notes || '',
    approvalStatus: initialApprovalStatus,
    eligibleForPayroll: false,
  }));

  try {
    await Attendance.insertMany(docsToInsert);
  } catch (err) {
    await AttendanceBatch.findByIdAndDelete(batch._id);
    throw err;
  }

  await recordAudit({
    actor,
    action: submitNow ? 'ATTENDANCE_BATCH_SUBMITTED' : 'ATTENDANCE_BATCH_DRAFT_CREATED',
    entityType: 'AttendanceBatch',
    entityId: batch._id,
    newData: { batchCode, dateKey, total: entries.length, status: batch.status },
    ipAddress,
  });

  if (submitNow) {
    await notifyRoles([ROLES.SUPERVISOR], {
      type: 'BATCH_SUBMITTED',
      title: 'New Attendance Batch Submitted',
      message: `${actor.name} submitted attendance batch ${batchCode} for ${dateKey} (${entries.length} employees).`,
      entityType: 'AttendanceBatch',
      entityId: batch._id,
    });
  }

  return batch;
}

export async function updateBatchRecords({ batchId, actor, updates, submitNow, ipAddress }) {
  const batch = await AttendanceBatch.findById(batchId);
  if (!batch) throw new AppError('Attendance batch not found', 404);

  const editableStatuses = new Set([
    ATTENDANCE_APPROVAL_STATUS.DRAFT,
    ATTENDANCE_APPROVAL_STATUS.RETURNED_TO_SUB_SUPERVISOR,
    ATTENDANCE_APPROVAL_STATUS.RETURNED_BY_OWNER,
  ]);

  const records = await Attendance.find({ batchId });
  const recordById = new Map(records.map((r) => [String(r._id), r]));

  const modifiedSummary = [];

  for (const item of updates || []) {
    const rec = recordById.get(String(item.attendanceId));
    if (!rec) throw new AppError(`Attendance record ${item.attendanceId} not found in batch`, 404);
    if (!editableStatuses.has(rec.approvalStatus)) {
      throw new AppError(
        `Record ${rec._id} is in ${rec.approvalStatus} state and cannot be edited by Sub-Supervisor`,
        400
      );
    }

    const prev = { status: rec.status, leavePaidType: rec.leavePaidType, notes: rec.notes };
    rec.status = item.status;
    rec.leavePaidType =
      item.status === ATTENDANCE_STATUS.LEAVE
        ? item.leavePaidType || LEAVE_PAID_TYPE.UNPAID
        : LEAVE_PAID_TYPE.NONE;
    if (item.notes !== undefined) rec.notes = item.notes;
    if (submitNow) {
      rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.SUBMITTED_TO_SUPERVISOR;
    }
    await rec.save();
    modifiedSummary.push({ id: rec._id, prev, next: { status: rec.status, notes: rec.notes } });
  }

  if (submitNow) {
    // Also promote any remaining DRAFT / RETURNED records in this batch
    for (const rec of records) {
      if (editableStatuses.has(rec.approvalStatus)) {
        rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.SUBMITTED_TO_SUPERVISOR;
        await rec.save();
      }
    }
    batch.submittedAt = new Date();
    await batch.save();
  }

  const updatedBatch = await recomputeBatchState(batch._id);

  await recordAudit({
    actor,
    action: submitNow ? 'ATTENDANCE_BATCH_RESUBMITTED' : 'ATTENDANCE_BATCH_UPDATED',
    entityType: 'AttendanceBatch',
    entityId: batch._id,
    newData: { updatedCount: modifiedSummary.length, status: updatedBatch.status },
    ipAddress,
  });

  if (submitNow) {
    await notifyRoles([ROLES.SUPERVISOR], {
      type: 'BATCH_SUBMITTED',
      title: 'Attendance Batch Ready for Review',
      message: `${actor.name} submitted/resubmitted batch ${updatedBatch.batchCode} (${updatedBatch.attendanceDateKey}).`,
      entityType: 'AttendanceBatch',
      entityId: batch._id,
    });
  }

  return updatedBatch;
}

export async function supervisorReviewBatch({ batchId, actor, actions, approveRemaining, ipAddress }) {
  const batch = await AttendanceBatch.findById(batchId);
  if (!batch) throw new AppError('Attendance batch not found', 404);

  const records = await Attendance.find({ batchId });
  const recordById = new Map(records.map((r) => [String(r._id), r]));

  const reviewableStatuses = new Set([
    ATTENDANCE_APPROVAL_STATUS.SUBMITTED_TO_SUPERVISOR,
    ATTENDANCE_APPROVAL_STATUS.FLAGGED_BY_SUPERVISOR,
  ]);

  let approvedCount = 0;
  let flaggedCount = 0;
  let returnedCount = 0;

  for (const act of actions || []) {
    const rec = recordById.get(String(act.attendanceId));
    if (!rec) throw new AppError(`Attendance record ${act.attendanceId} not found in batch`, 404);
    if (!reviewableStatuses.has(rec.approvalStatus)) {
      throw new AppError(`Record ${rec._id} cannot be reviewed by Supervisor in state ${rec.approvalStatus}`, 400);
    }

    if (act.decision === 'APPROVE') {
      rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED;
      rec.supervisorReason = act.reason || '';
      approvedCount += 1;
    } else if (act.decision === 'FLAG') {
      if (!act.reason?.trim()) throw new AppError('A reason is required to flag a record', 400);
      rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.FLAGGED_BY_SUPERVISOR;
      rec.supervisorReason = act.reason.trim();
      flaggedCount += 1;
    } else if (act.decision === 'RETURN') {
      if (!act.reason?.trim()) throw new AppError('A reason is required to reject/return a record', 400);
      rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.RETURNED_TO_SUB_SUPERVISOR;
      rec.supervisorReason = act.reason.trim();
      returnedCount += 1;
    }

    rec.supervisorActionBy = actor._id;
    rec.supervisorActionAt = new Date();
    await rec.save();
  }

  if (approveRemaining) {
    for (const rec of records) {
      const targeted = (actions || []).some((a) => String(a.attendanceId) === String(rec._id));
      if (!targeted && rec.approvalStatus === ATTENDANCE_APPROVAL_STATUS.SUBMITTED_TO_SUPERVISOR) {
        rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED;
        rec.supervisorActionBy = actor._id;
        rec.supervisorActionAt = new Date();
        await rec.save();
        approvedCount += 1;
      }
    }
  }

  batch.supervisorReviewedBy = actor._id;
  batch.supervisorReviewedAt = new Date();
  await batch.save();

  const updatedBatch = await recomputeBatchState(batch._id);

  await recordAudit({
    actor,
    action: 'SUPERVISOR_BATCH_REVIEWED',
    entityType: 'AttendanceBatch',
    entityId: batch._id,
    newData: { approvedCount, flaggedCount, returnedCount, batchStatus: updatedBatch.status },
    ipAddress,
  });

  if (approvedCount > 0) {
    await notifyRoles([ROLES.OWNER], {
      type: 'SUPERVISOR_APPROVED_BATCH',
      title: 'Attendance Ready for Owner Approval',
      message: `Supervisor ${actor.name} approved ${approvedCount} record(s) in batch ${updatedBatch.batchCode} (${updatedBatch.attendanceDateKey}).`,
      entityType: 'AttendanceBatch',
      entityId: batch._id,
    });
  }

  if (returnedCount > 0 || flaggedCount > 0) {
    await notifyUsers([batch.submittedBy], {
      type: 'RECORDS_RETURNED_OR_FLAGGED',
      title: 'Attendance Records Flagged / Returned',
      message: `Supervisor ${actor.name} flagged ${flaggedCount} and returned ${returnedCount} record(s) in batch ${updatedBatch.batchCode}.`,
      entityType: 'AttendanceBatch',
      entityId: batch._id,
    });
  }

  return updatedBatch;
}

export async function ownerReviewBatch({ batchId, actor, actions, approveRemaining, ipAddress }) {
  const batch = await AttendanceBatch.findById(batchId);
  if (!batch) throw new AppError('Attendance batch not found', 404);

  const records = await Attendance.find({ batchId });
  const recordById = new Map(records.map((r) => [String(r._id), r]));

  let approvedCount = 0;
  let returnedCount = 0;

  for (const act of actions || []) {
    const rec = recordById.get(String(act.attendanceId));
    if (!rec) throw new AppError(`Attendance record ${act.attendanceId} not found in batch`, 404);
    if (rec.approvalStatus !== ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED) {
      throw new AppError(
        `Record ${rec._id} must be SUPERVISOR_APPROVED before Owner action (current: ${rec.approvalStatus})`,
        400
      );
    }

    if (act.decision === 'APPROVE') {
      rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED;
      rec.eligibleForPayroll = true;
      rec.ownerReason = act.reason || '';
      approvedCount += 1;
    } else if (act.decision === 'RETURN') {
      if (!act.reason?.trim()) throw new AppError('A reason is required to reject/return a record', 400);
      rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.RETURNED_BY_OWNER;
      rec.eligibleForPayroll = false;
      rec.ownerReason = act.reason.trim();
      returnedCount += 1;
    }

    rec.ownerActionBy = actor._id;
    rec.ownerActionAt = new Date();
    await rec.save();
  }

  if (approveRemaining) {
    for (const rec of records) {
      const targeted = (actions || []).some((a) => String(a.attendanceId) === String(rec._id));
      if (!targeted && rec.approvalStatus === ATTENDANCE_APPROVAL_STATUS.SUPERVISOR_APPROVED) {
        rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED;
        rec.eligibleForPayroll = true;
        rec.ownerActionBy = actor._id;
        rec.ownerActionAt = new Date();
        await rec.save();
        approvedCount += 1;
      }
    }
  }

  batch.ownerReviewedBy = actor._id;
  batch.ownerReviewedAt = new Date();
  await batch.save();

  const updatedBatch = await recomputeBatchState(batch._id);

  await recordAudit({
    actor,
    action: 'OWNER_BATCH_REVIEWED',
    entityType: 'AttendanceBatch',
    entityId: batch._id,
    newData: { approvedCount, returnedCount, batchStatus: updatedBatch.status },
    ipAddress,
  });

  if (returnedCount > 0) {
    await notifyUsers([batch.submittedBy], {
      type: 'RECORDS_RETURNED_BY_OWNER',
      title: 'Attendance Returned by Owner',
      message: `Owner returned ${returnedCount} record(s) in batch ${updatedBatch.batchCode} for correction.`,
      entityType: 'AttendanceBatch',
      entityId: batch._id,
    });
    await notifyRoles([ROLES.SUPERVISOR], {
      type: 'RECORDS_RETURNED_BY_OWNER',
      title: 'Owner Returned Attendance Records',
      message: `Owner returned ${returnedCount} record(s) in batch ${updatedBatch.batchCode} for correction.`,
      entityType: 'AttendanceBatch',
      entityId: batch._id,
    });
  }

  return updatedBatch;
}

export async function reopenAttendanceRecord({ attendanceId, actor, reason, ipAddress }) {
  if (!reason?.trim()) {
    throw new AppError('A mandatory reason is required to reopen approved attendance', 400);
  }

  const rec = await Attendance.findById(attendanceId);
  if (!rec) throw new AppError('Attendance record not found', 404);

  if (rec.approvalStatus === ATTENDANCE_APPROVAL_STATUS.LOCKED_IN_PAYROLL) {
    throw new AppError(
      'Cannot reopen attendance locked in a finalized payroll. Create an adjustment in the next eligible payroll instead.',
      409
    );
  }

  if (rec.approvalStatus !== ATTENDANCE_APPROVAL_STATUS.OWNER_APPROVED) {
    throw new AppError('Only OWNER_APPROVED attendance records can be reopened', 400);
  }

  const prevStatus = rec.approvalStatus;
  rec.reopenHistory.push({
    reopenedBy: actor._id,
    reopenedAt: new Date(),
    reason: reason.trim(),
    previousStatus: prevStatus,
  });
  rec.approvalStatus = ATTENDANCE_APPROVAL_STATUS.RETURNED_BY_OWNER;
  rec.eligibleForPayroll = false;
  rec.ownerReason = reason.trim();
  rec.ownerActionBy = actor._id;
  rec.ownerActionAt = new Date();
  await rec.save();

  const updatedBatch = await recomputeBatchState(rec.batchId);

  await recordAudit({
    actor,
    action: 'ATTENDANCE_REOPENED',
    entityType: 'Attendance',
    entityId: rec._id,
    previousData: { approvalStatus: prevStatus },
    newData: { approvalStatus: rec.approvalStatus },
    reason: reason.trim(),
    ipAddress,
  });

  await notifyRoles([ROLES.SUPERVISOR, ROLES.SUB_SUPERVISOR], {
    type: 'ATTENDANCE_REOPENED',
    title: 'Approved Attendance Reopened',
    message: `Owner reopened attendance on ${rec.attendanceDateKey}: ${reason.trim()}`,
    entityType: 'AttendanceBatch',
    entityId: rec.batchId,
  });

  return { record: rec, batch: updatedBatch };
}
