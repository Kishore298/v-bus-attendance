import {
  EMPLOYEE_TYPES,
  PAYROLL_FREQUENCY,
  ROLES,
  SALARY_TYPES,
} from '../constants/enums.js';
import { Employee } from '../models/Employee.js';
import { SalaryStructure } from '../models/SalaryStructure.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { User } from '../models/User.js';

export async function ensureDemoSeed() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return { seeded: false };

  await SystemSetting.findOneAndUpdate(
    { key: 'COMPANY_CONFIG' },
    {
      $setOnInsert: {
        key: 'COMPANY_CONFIG',
        companyName: 'V Bus Holidays',
        companyAddress: 'Connecting to City • Central Bus Depot, NH-48 Highway, Transport Nagar',
        companyLogoText: 'V-BUS',
        companyPhone: '+91 98765 43210',
        currencySymbol: '₹',
      },
    },
    { upsert: true }
  );

  const [ownerHash, supHash, subHash] = await Promise.all([
    User.hashPassword('Owner@123'),
    User.hashPassword('Supervisor@123'),
    User.hashPassword('SubSup@123'),
  ]);

  const [owner] = await User.insertMany([
    { name: 'Vikram Patel (Owner)', email: 'owner@vbus.com', passwordHash: ownerHash, role: ROLES.OWNER },
    { name: 'Ramesh Nair (Supervisor)', email: 'supervisor@vbus.com', passwordHash: supHash, role: ROLES.SUPERVISOR },
    { name: 'Suresh Kumar (Sub-Supervisor)', email: 'sub@vbus.com', passwordHash: subHash, role: ROLES.SUB_SUPERVISOR },
  ]);

  const demoStaff = [
    {
      employeeCode: 'DRV-0001',
      fullName: 'Rajesh Sharma',
      employeeType: EMPLOYEE_TYPES.DRIVER,
      mobile: '9876500001',
      payrollFrequency: PAYROLL_FREQUENCY.MONTHLY,
      salaryType: SALARY_TYPES.FIXED_MONTHLY,
      amount: 24000,
    },
    {
      employeeCode: 'DRV-0002',
      fullName: 'Mahesh Yadav',
      employeeType: EMPLOYEE_TYPES.DRIVER,
      mobile: '9876500002',
      payrollFrequency: PAYROLL_FREQUENCY.WEEKLY,
      salaryType: SALARY_TYPES.FIXED_WEEKLY,
      amount: 5600,
    },
    {
      employeeCode: 'DRV-0003',
      fullName: 'Arjun Verma',
      employeeType: EMPLOYEE_TYPES.DRIVER,
      mobile: '9876500003',
      payrollFrequency: PAYROLL_FREQUENCY.MONTHLY,
      salaryType: SALARY_TYPES.FIXED_MONTHLY,
      amount: 21000,
    },
    {
      employeeCode: 'CLN-0001',
      fullName: 'Karan Das',
      employeeType: EMPLOYEE_TYPES.CLEANER,
      mobile: '9876500004',
      payrollFrequency: PAYROLL_FREQUENCY.WEEKLY,
      salaryType: SALARY_TYPES.FIXED_WEEKLY,
      amount: 3500,
    },
    {
      employeeCode: 'CLN-0002',
      fullName: 'Deepak Singh',
      employeeType: EMPLOYEE_TYPES.CLEANER,
      mobile: '9876500005',
      payrollFrequency: PAYROLL_FREQUENCY.MONTHLY,
      salaryType: SALARY_TYPES.FIXED_MONTHLY,
      amount: 15000,
    },
    {
      employeeCode: 'CLN-0003',
      fullName: 'Prakash Rao',
      employeeType: EMPLOYEE_TYPES.CLEANER,
      mobile: '9876500006',
      payrollFrequency: PAYROLL_FREQUENCY.WEEKLY,
      salaryType: SALARY_TYPES.DAILY_WAGE,
      amount: 550,
    },
  ];

  const joiningDate = new Date('2026-01-01T00:00:00.000Z');
  for (const s of demoStaff) {
    const emp = await Employee.create({
      employeeCode: s.employeeCode,
      fullName: s.fullName,
      employeeType: s.employeeType,
      mobile: s.mobile,
      joiningDate,
      payrollFrequency: s.payrollFrequency,
      payrollFrequencyEffectiveFrom: joiningDate,
    });

    const structure = await SalaryStructure.create({
      employeeId: emp._id,
      salaryType: s.salaryType,
      amount: s.amount,
      effectiveFrom: joiningDate,
      isActive: true,
      createdBy: owner._id,
    });

    emp.currentSalaryStructureId = structure._id;
    await emp.save();
  }

  console.log('[SEED] Demo accounts and 6 staff members seeded.');
  return { seeded: true };
}
