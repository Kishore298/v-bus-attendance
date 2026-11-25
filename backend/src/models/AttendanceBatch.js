import mongoose from 'mongoose';
import { BATCH_STATUS } from '../constants/enums.js';

const attendanceBatchSchema = new mongoose.Schema(
  {
    batchCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    attendanceDateKey: { type: String, required: true, index: true },
    attendanceDate: { type: Date, required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submittedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(BATCH_STATUS),
      default: BATCH_STATUS.DRAFT,
      index: true,
    },
    counts: {
      total: { type: Number, default: 0 },
      drivers: { type: Number, default: 0 },
      cleaners: { type: Number, default: 0 },
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      halfDay: { type: Number, default: 0 },
      leave: { type: Number, default: 0 },
      holiday: { type: Number, default: 0 },
    },
    supervisorReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    supervisorReviewedAt: { type: Date, default: null },
    ownerReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ownerReviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attendanceBatchSchema.index({ attendanceDateKey: -1, createdAt: -1 });

export const AttendanceBatch = mongoose.model('AttendanceBatch', attendanceBatchSchema);
