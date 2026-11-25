import mongoose from 'mongoose';
import {
  ATTENDANCE_APPROVAL_STATUS,
  ATTENDANCE_STATUS,
  LEAVE_PAID_TYPE,
} from '../constants/enums.js';

const reopenEntrySchema = new mongoose.Schema(
  {
    reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reopenedAt: { type: Date, default: Date.now },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    previousStatus: { type: String, required: true },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceBatch', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    attendanceDateKey: { type: String, required: true, index: true },
    attendanceDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(ATTENDANCE_STATUS), required: true },
    leavePaidType: {
      type: String,
      enum: Object.values(LEAVE_PAID_TYPE),
      default: LEAVE_PAID_TYPE.NONE,
    },
    notes: { type: String, trim: true, maxlength: 400, default: '' },
    approvalStatus: {
      type: String,
      enum: Object.values(ATTENDANCE_APPROVAL_STATUS),
      default: ATTENDANCE_APPROVAL_STATUS.DRAFT,
      index: true,
    },
    eligibleForPayroll: { type: Boolean, default: false, index: true },
    supervisorActionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    supervisorActionAt: { type: Date, default: null },
    supervisorReason: { type: String, trim: true, maxlength: 400, default: '' },
    ownerActionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ownerActionAt: { type: Date, default: null },
    ownerReason: { type: String, trim: true, maxlength: 400, default: '' },
    reopenHistory: { type: [reopenEntrySchema], default: [] },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', default: null, index: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, attendanceDateKey: 1 }, { unique: true });
attendanceSchema.index({ approvalStatus: 1, attendanceDateKey: 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
