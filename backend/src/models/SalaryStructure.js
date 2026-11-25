import mongoose from 'mongoose';
import { SALARY_TYPES } from '../constants/enums.js';

const salaryStructureSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    salaryType: { type: String, enum: Object.values(SALARY_TYPES), required: true },
    amount: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true, index: true },
    effectiveTo: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

salaryStructureSchema.index({ employeeId: 1, effectiveFrom: -1 });

export const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);
