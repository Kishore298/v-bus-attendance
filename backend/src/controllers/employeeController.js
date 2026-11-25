import {
  EMPLOYEE_STATUS,
  EMPLOYEE_TYPES,
  PAYROLL_STATUS,
  ROLES,
} from '../constants/enums.js';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { Payroll } from '../models/Payroll.js';
import { SalaryStructure } from '../models/SalaryStructure.js';
import { recordAudit } from '../services/auditService.js';
import { parseDateKeyStart, toDateKey } from '../utils/dates.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { sanitizeEmployeeForRole, sanitizeEmployeesForRole } from '../utils/projections.js';

async function generateEmployeeCode(employeeType) {
  const prefix = employeeType === EMPLOYEE_TYPES.DRIVER ? 'DRV' : 'CLN';
  const latest = await Employee.findOne({ employeeCode: new RegExp(`^${prefix}-`) })
    .sort({ employeeCode: -1 })
    .select('employeeCode')
    .lean();

  let seq = 1;
  if (latest?.employeeCode) {
    const parts = latest.employeeCode.split('-');
    const num = Number(parts[1]);
    if (!Number.isNaN(num)) seq = num + 1;
  }
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

export const listEmployees = asyncHandler(async (req, res) => {
  const { search, employeeType, status, payrollFrequency, page = 1, limit = 50 } = req.query;
  const isSubSupervisor = req.user.role === ROLES.SUB_SUPERVISOR;

  const filter = { isDeleted: false };
  if (isSubSupervisor) {
    filter.status = EMPLOYEE_STATUS.ACTIVE;
  } else {
    if (status) filter.status = status;
    if (payrollFrequency) filter.payrollFrequency = payrollFrequency;
  }

  if (employeeType) filter.employeeType = employeeType;
  if (search?.trim()) {
    const rx = new RegExp(search.trim(), 'i');
    filter.$or = [{ fullName: rx }, { employeeCode: rx }, ...(!isSubSupervisor ? [{ mobile: rx }] : [])];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const baseSelect = isSubSupervisor
    ? '_id employeeCode fullName employeeType status'
    : '';

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .select(baseSelect)
      .sort({ employeeCode: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  if (isSubSupervisor) {
    return res.json({
      success: true,
      employees: sanitizeEmployeesForRole(employees, req.user.role),
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  }

  // Attach active salary structure for Owner & Supervisor
  const salaryIds = employees.map((e) => e.currentSalaryStructureId).filter(Boolean);
  const structures = await SalaryStructure.find({ _id: { $in: salaryIds } }).lean();
  const structureMap = new Map(structures.map((s) => [String(s._id), s]));

  const enriched = employees.map((emp) => ({
    ...emp,
    currentSalary: structureMap.get(String(emp.currentSalaryStructureId)) || null,
  }));

  res.json({
    success: true,
    employees: enriched,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const {
    fullName,
    employeeType,
    mobile,
    joiningDate,
    payrollFrequency,
    salaryType,
    salaryAmount,
    salaryEffectiveDate,
    notes,
  } = req.body;

  const employeeCode = await generateEmployeeCode(employeeType);
  const effectiveDate = salaryEffectiveDate
    ? parseDateKeyStart(toDateKey(salaryEffectiveDate))
    : parseDateKeyStart(toDateKey(joiningDate));

  const employee = await Employee.create({
    employeeCode,
    fullName,
    employeeType,
    mobile,
    joiningDate: parseDateKeyStart(toDateKey(joiningDate)),
    payrollFrequency,
    payrollFrequencyEffectiveFrom: effectiveDate,
    notes: notes || '',
  });

  const salaryStructure = await SalaryStructure.create({
    employeeId: employee._id,
    salaryType,
    amount: Number(salaryAmount),
    effectiveFrom: effectiveDate,
    isActive: true,
    createdBy: req.user._id,
  });

  employee.currentSalaryStructureId = salaryStructure._id;
  await employee.save();

  await recordAudit({
    actor: req.user,
    action: 'EMPLOYEE_CREATED',
    entityType: 'Employee',
    entityId: employee._id,
    newData: {
      employeeCode,
      fullName,
      employeeType,
      payrollFrequency,
      salaryType,
      salaryAmount,
    },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    employee: { ...employee.toObject(), currentSalary: salaryStructure },
  });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne({ _id: req.params.id, isDeleted: false }).lean();
  if (!emp) throw new AppError('Employee not found', 404);

  if (req.user.role === ROLES.SUB_SUPERVISOR) {
    return res.json({
      success: true,
      employee: sanitizeEmployeeForRole(emp, req.user.role),
    });
  }

  const salaryHistory = await SalaryStructure.find({ employeeId: emp._id })
    .sort({ effectiveFrom: -1, createdAt: -1 })
    .lean();

  res.json({
    success: true,
    employee: {
      ...emp,
      currentSalary: salaryHistory.find((s) => s.isActive) || salaryHistory[0] || null,
      salaryHistory,
    },
  });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne({ _id: req.params.id, isDeleted: false });
  if (!emp) throw new AppError('Employee not found', 404);

  const prev = {
    fullName: emp.fullName,
    employeeType: emp.employeeType,
    mobile: emp.mobile,
    status: emp.status,
    payrollFrequency: emp.payrollFrequency,
    notes: emp.notes,
  };

  if (
    req.body.payrollFrequency &&
    req.body.payrollFrequency !== emp.payrollFrequency
  ) {
    const effDate = req.body.payrollFrequencyEffectiveFrom
      ? parseDateKeyStart(toDateKey(req.body.payrollFrequencyEffectiveFrom))
      : new Date();

    // Ensure effective date does not fall inside an already finalized payroll of the new or old frequency
    const finalizedOverlap = await Payroll.findOne({
      status: PAYROLL_STATUS.FINALIZED,
      periodStart: { $lte: effDate },
      periodEnd: { $gte: effDate },
    }).lean();

    if (finalizedOverlap) {
      throw new AppError(
        `Cannot set payroll frequency effective date inside finalized payroll period ${finalizedOverlap.periodKey}`,
        409
      );
    }

    emp.payrollFrequency = req.body.payrollFrequency;
    emp.payrollFrequencyEffectiveFrom = effDate;
  }

  if (req.body.fullName !== undefined) emp.fullName = req.body.fullName;
  if (req.body.employeeType !== undefined) emp.employeeType = req.body.employeeType;
  if (req.body.mobile !== undefined) emp.mobile = req.body.mobile;
  if (req.body.joiningDate !== undefined) {
    emp.joiningDate = parseDateKeyStart(toDateKey(req.body.joiningDate));
  }
  if (req.body.status !== undefined) emp.status = req.body.status;
  if (req.body.notes !== undefined) emp.notes = req.body.notes;

  await emp.save();

  await recordAudit({
    actor: req.user,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'Employee',
    entityId: emp._id,
    previousData: prev,
    newData: {
      fullName: emp.fullName,
      employeeType: emp.employeeType,
      mobile: emp.mobile,
      status: emp.status,
      payrollFrequency: emp.payrollFrequency,
    },
    ipAddress: req.ip,
  });

  res.json({ success: true, employee: emp });
});

export const updateEmployeeSalary = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne({ _id: req.params.id, isDeleted: false });
  if (!emp) throw new AppError('Employee not found', 404);

  const { salaryType, amount, effectiveFrom, notes } = req.body;
  const effDate = parseDateKeyStart(toDateKey(effectiveFrom));

  const prevStructure = await SalaryStructure.findOne({
    employeeId: emp._id,
    isActive: true,
  });

  if (prevStructure) {
    prevStructure.isActive = false;
    const prevEnd = new Date(effDate.getTime() - 1);
    prevStructure.effectiveTo = prevEnd > prevStructure.effectiveFrom ? prevEnd : effDate;
    await prevStructure.save();
  }

  const newStructure = await SalaryStructure.create({
    employeeId: emp._id,
    salaryType,
    amount: Number(amount),
    effectiveFrom: effDate,
    isActive: true,
    notes: notes || '',
    createdBy: req.user._id,
  });

  emp.currentSalaryStructureId = newStructure._id;
  await emp.save();

  await recordAudit({
    actor: req.user,
    action: 'SALARY_STRUCTURE_UPDATED',
    entityType: 'SalaryStructure',
    entityId: newStructure._id,
    previousData: prevStructure
      ? { salaryType: prevStructure.salaryType, amount: prevStructure.amount }
      : null,
    newData: { employeeCode: emp.employeeCode, salaryType, amount, effectiveFrom: effDate },
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, salaryStructure: newStructure });
});

export const softDeleteEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne({ _id: req.params.id, isDeleted: false });
  if (!emp) throw new AppError('Employee not found', 404);

  emp.status = EMPLOYEE_STATUS.INACTIVE;
  emp.isDeleted = true;
  emp.deletedAt = new Date();
  emp.deletedBy = req.user._id;
  await emp.save();

  await recordAudit({
    actor: req.user,
    action: 'EMPLOYEE_SOFT_DELETED',
    entityType: 'Employee',
    entityId: emp._id,
    previousData: { status: EMPLOYEE_STATUS.ACTIVE, isDeleted: false },
    newData: { status: EMPLOYEE_STATUS.INACTIVE, isDeleted: true },
    reason: req.body?.reason || 'Soft deleted by Owner',
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Employee deactivated and soft-deleted (history preserved)' });
});

export const getEmployeeAttendanceHistory = asyncHandler(async (req, res) => {
  const emp = await Employee.findById(req.params.id).lean();
  if (!emp) throw new AppError('Employee not found', 404);

  const records = await Attendance.find({ employeeId: emp._id })
    .sort({ attendanceDateKey: -1 })
    .limit(120)
    .lean();

  res.json({
    success: true,
    employee: sanitizeEmployeeForRole(emp, req.user.role),
    records,
  });
});
