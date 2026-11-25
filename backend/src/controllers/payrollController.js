import { Payroll } from '../models/Payroll.js';
import { PayrollItem } from '../models/PayrollItem.js';
import { finalizePayroll, generatePayrollPreview } from '../services/payrollService.js';
import { generatePayslipPdfBuffer } from '../services/pdfService.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const previewPayroll = asyncHandler(async (req, res) => {
  const { frequency, year, month, weekStartKey } = req.body;
  const result = await generatePayrollPreview({
    actor: req.user,
    frequency,
    year,
    month,
    weekStartKey,
    ipAddress: req.ip,
  });

  res.json({ success: true, ...result });
});

export const listPayrolls = asyncHandler(async (req, res) => {
  const { frequency, status } = req.query;
  const filter = {};
  if (frequency) filter.frequency = frequency;
  if (status) filter.status = status;

  const payrolls = await Payroll.find(filter)
    .populate('generatedBy', 'name')
    .populate('finalizedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ success: true, payrolls });
});

export const getPayrollDetail = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate('generatedBy', 'name')
    .populate('finalizedBy', 'name')
    .lean();

  if (!payroll) throw new AppError('Payroll not found', 404);

  const items = await PayrollItem.find({ payrollId: payroll._id })
    .sort({ 'employeeSnapshot.employeeCode': 1 })
    .lean();

  res.json({ success: true, payroll, items });
});

export const finalizePayrollHandler = asyncHandler(async (req, res) => {
  const result = await finalizePayroll({
    payrollId: req.params.id,
    actor: req.user,
    ipAddress: req.ip,
  });

  res.json({ success: true, ...result });
});

export const downloadPayslipPdf = asyncHandler(async (req, res) => {
  const item = await PayrollItem.findById(req.params.itemId).lean();
  if (!item) throw new AppError('Payslip record not found', 404);

  const payroll = await Payroll.findById(item.payrollId).lean();
  if (!payroll) throw new AppError('Parent payroll not found', 404);

  const pdfBuffer = await generatePayslipPdfBuffer(payroll, item);
  const filename = `${item.payslipNumber || item.employeeSnapshot.employeeCode}-payslip.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});
