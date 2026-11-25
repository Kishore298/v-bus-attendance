import mongoose from 'mongoose';
import { PAYROLL_FREQUENCY, PAYROLL_STATUS } from '../constants/enums.js';

const payrollSchema = new mongoose.Schema(
  {
    payrollCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    frequency: { type: String, enum: Object.values(PAYROLL_FREQUENCY), required: true, index: true },
    periodKey: { type: String, required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    periodStartKey: { type: String, required: true },
    periodEndKey: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(PAYROLL_STATUS),
      default: PAYROLL_STATUS.DRAFT_PREVIEW,
      index: true,
    },
    totals: {
      employeeCount: { type: Number, default: 0 },
      grossEarnings: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
      netPayable: { type: Number, default: 0 },
    },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

payrollSchema.index({ frequency: 1, periodKey: 1 }, { unique: true });

export const Payroll = mongoose.model('Payroll', payrollSchema);
