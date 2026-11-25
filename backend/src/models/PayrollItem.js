import mongoose from 'mongoose';

const adjustmentSnapshotSchema = new mongoose.Schema(
  {
    adjustmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryAdjustment', required: true },
    adjustmentCode: { type: String, required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    stage: { type: String, required: true },
    applicableDateKey: { type: String, required: true },
  },
  { _id: false }
);

const payrollItemSchema = new mongoose.Schema(
  {
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    payslipNumber: { type: String, default: null, index: true },
    companySnapshot: {
      companyName: { type: String, required: true },
      companyAddress: { type: String, required: true },
      companyLogoText: { type: String, default: 'VB' },
      currencySymbol: { type: String, default: '₹' },
    },
    employeeSnapshot: {
      employeeCode: { type: String, required: true },
      fullName: { type: String, required: true },
      employeeType: { type: String, required: true },
      payrollFrequency: { type: String, required: true },
      mobile: { type: String, default: '' },
    },
    salaryStructureSnapshot: {
      salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },
      salaryType: { type: String, required: true },
      baseAmount: { type: Number, required: true },
      periodDivisorDays: { type: Number, required: true },
      perDayRate: { type: Number, required: true },
      effectiveFrom: { type: Date, default: null },
    },
    attendanceSummary: {
      totalPeriodDays: { type: Number, default: 0 },
      recordedDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      halfDays: { type: Number, default: 0 },
      paidLeaveDays: { type: Number, default: 0 },
      unpaidLeaveDays: { type: Number, default: 0 },
      holidayDays: { type: Number, default: 0 },
      payableDays: { type: Number, default: 0 },
    },
    earnings: {
      fixedSalaryComponent: { type: Number, default: 0 },
      adjustments: { type: [adjustmentSnapshotSchema], default: [] },
      totalAdjustments: { type: Number, default: 0 },
      grossEarnings: { type: Number, default: 0 },
    },
    deductions: {
      absentDeduction: { type: Number, default: 0 },
      halfDayDeduction: { type: Number, default: 0 },
      unpaidLeaveDeduction: { type: Number, default: 0 },
      adjustments: { type: [adjustmentSnapshotSchema], default: [] },
      totalOtherDeductions: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
    },
    netPayable: { type: Number, default: 0 },
    attendanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],
    adjustmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalaryAdjustment' }],
    warnings: { type: [String], default: [] },
    isFinalized: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

payrollItemSchema.index({ payrollId: 1, employeeId: 1 }, { unique: true });

export const PayrollItem = mongoose.model('PayrollItem', payrollItemSchema);
