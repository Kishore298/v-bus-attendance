import { ATTENDANCE_APPROVAL_STATUS, ROLES } from '../constants/enums.js';
import { Attendance } from '../models/Attendance.js';
import { AttendanceBatch } from '../models/AttendanceBatch.js';
import {
  createOrSaveBatch,
  ownerReviewBatch,
  reopenAttendanceRecord,
  supervisorReviewBatch,
  updateBatchRecords,
} from '../services/attendanceService.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { sanitizeEmployeePopulatedField } from '../utils/projections.js';

export const createBatch = asyncHandler(async (req, res) => {
  const batch = await createOrSaveBatch({
    actor: req.user,
    attendanceDate: req.body.attendanceDate,
    entries: req.body.entries,
    submitNow: req.body.submitNow,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, batch });
});

export const listBatches = asyncHandler(async (req, res) => {
  const { status, dateKey, page = 1, limit = 25 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (dateKey) filter.attendanceDateKey = dateKey;
  if (req.user.role === ROLES.SUB_SUPERVISOR) {
    filter.submittedBy = req.user._id;
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [batches, total] = await Promise.all([
    AttendanceBatch.find(filter)
      .populate('submittedBy', 'name role')
      .populate('supervisorReviewedBy', 'name role')
      .populate('ownerReviewedBy', 'name role')
      .sort({ attendanceDateKey: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AttendanceBatch.countDocuments(filter),
  ]);

  res.json({
    success: true,
    batches,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

export const getBatchDetail = asyncHandler(async (req, res) => {
  const batch = await AttendanceBatch.findById(req.params.id)
    .populate('submittedBy', 'name role')
    .populate('supervisorReviewedBy', 'name role')
    .populate('ownerReviewedBy', 'name role')
    .lean();

  if (!batch) throw new AppError('Attendance batch not found', 404);

  const records = await Attendance.find({ batchId: batch._id })
    .populate('employeeId', 'employeeCode fullName employeeType status payrollFrequency')
    .lean();

  const sanitizedRecords = records
    .map((rec) => ({
      ...rec,
      employeeId: sanitizeEmployeePopulatedField(rec.employeeId, req.user.role),
    }))
    .sort((a, b) =>
      (a.employeeId?.employeeCode || '').localeCompare(b.employeeId?.employeeCode || '')
    );

  res.json({ success: true, batch, records: sanitizedRecords });
});

export const updateBatch = asyncHandler(async (req, res) => {
  const batch = await updateBatchRecords({
    batchId: req.params.id,
    actor: req.user,
    updates: req.body.updates,
    submitNow: req.body.submitNow,
    ipAddress: req.ip,
  });

  res.json({ success: true, batch });
});

export const supervisorReview = asyncHandler(async (req, res) => {
  const batch = await supervisorReviewBatch({
    batchId: req.params.id,
    actor: req.user,
    actions: req.body.actions,
    approveRemaining: req.body.approveRemaining,
    ipAddress: req.ip,
  });

  res.json({ success: true, batch });
});

export const ownerReview = asyncHandler(async (req, res) => {
  const batch = await ownerReviewBatch({
    batchId: req.params.id,
    actor: req.user,
    actions: req.body.actions,
    approveRemaining: req.body.approveRemaining,
    ipAddress: req.ip,
  });

  res.json({ success: true, batch });
});

export const reopenRecord = asyncHandler(async (req, res) => {
  const result = await reopenAttendanceRecord({
    attendanceId: req.params.id,
    actor: req.user,
    reason: req.body.reason,
    ipAddress: req.ip,
  });

  res.json({ success: true, ...result });
});

export const listActionRequiredRecords = asyncHandler(async (req, res) => {
  const records = await Attendance.find({
    approvalStatus: {
      $in: [
        ATTENDANCE_APPROVAL_STATUS.RETURNED_TO_SUB_SUPERVISOR,
        ATTENDANCE_APPROVAL_STATUS.RETURNED_BY_OWNER,
        ATTENDANCE_APPROVAL_STATUS.FLAGGED_BY_SUPERVISOR,
      ],
    },
  })
    .populate('employeeId', 'employeeCode fullName employeeType status')
    .populate('batchId', 'batchCode attendanceDateKey')
    .sort({ attendanceDateKey: -1 })
    .lean();

  const sanitized = records.map((r) => ({
    ...r,
    employeeId: sanitizeEmployeePopulatedField(r.employeeId, req.user.role),
  }));

  res.json({ success: true, records: sanitized });
});
