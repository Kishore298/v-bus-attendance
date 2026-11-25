import mongoose from 'mongoose';
import {
  ADJUSTMENT_CATEGORY,
  ADJUSTMENT_INCLUSION_STATUS,
  ADJUSTMENT_STAGE,
  ADJUSTMENT_TYPE,
  PAYROLL_FREQUENCY,
} from '../constants/enums.js';

const salaryAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    stage: { type: String, enum: Object.values(ADJUSTMENT_STAGE), required: true, index: true },
    category: { type: String, enum: Object.values(ADJUSTMENT_CATEGORY), required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: Object.values(ADJUSTMENT_TYPE), required: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    applicableDateKey: { type: String, required: true, index: true },
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', default: null },
    periodType: { type: String, enum: Object.values(PAYROLL_FREQUENCY), required: true },
    periodKey: { type: String, required: true, index: true },
    inclusionStatus: {
      type: String,
      enum: Object.values(ADJUSTMENT_INCLUSION_STATUS),
      default: ADJUSTMENT_INCLUSION_STATUS.PENDING,
      index: true,
    },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', default: null, index: true },
    payrollItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollItem', default: null },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

salaryAdjustmentSchema.index({ employeeId: 1, inclusionStatus: 1, applicableDateKey: 1 });

export const SalaryAdjustment = mongoose.model('SalaryAdjustment', salaryAdjustmentSchema);
