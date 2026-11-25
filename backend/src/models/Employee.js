import mongoose from 'mongoose';
import { EMPLOYEE_STATUS, EMPLOYEE_TYPES, PAYROLL_FREQUENCY } from '../constants/enums.js';

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    employeeType: { type: String, enum: Object.values(EMPLOYEE_TYPES), required: true, index: true },
    mobile: { type: String, required: true, trim: true, maxlength: 20 },
    joiningDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(EMPLOYEE_STATUS), default: EMPLOYEE_STATUS.ACTIVE, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    payrollFrequency: {
      type: String,
      enum: Object.values(PAYROLL_FREQUENCY),
      required: true,
      default: PAYROLL_FREQUENCY.MONTHLY,
      index: true,
    },
    payrollFrequencyEffectiveFrom: { type: Date, default: Date.now },
    currentSalaryStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryStructure',
      default: null,
    },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

employeeSchema.index({ isDeleted: 1, status: 1, employeeType: 1 });
employeeSchema.index({ fullName: 'text', employeeCode: 'text', mobile: 'text' });

export const Employee = mongoose.model('Employee', employeeSchema);
