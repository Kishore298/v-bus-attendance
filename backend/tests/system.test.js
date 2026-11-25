import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ensureDemoSeed } from '../src/seeds/seedData.js';

let replSet;
let app;
let ownerToken;
let supervisorToken;
let subToken;

async function loginAs(email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token;
}

describe('Bus Operator Attendance & Payroll API Integration', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.connect(replSet.getUri());
    app = createApp();
    await ensureDemoSeed();

    ownerToken = await loginAs('owner@vbus.com', 'Owner@123');
    supervisorToken = await loginAs('supervisor@vbus.com', 'Supervisor@123');
    subToken = await loginAs('sub@vbus.com', 'SubSup@123');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  it('enforces strict backend salary confidentiality for Sub-Supervisor and RBAC for Supervisor', async () => {
    // Sub-Supervisor employee list must omit all salary/payroll/mobile/notes fields
    const subEmpRes = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${subToken}`);
    expect(subEmpRes.status).toBe(200);
    expect(subEmpRes.body.employees.length).toBeGreaterThan(0);
    const firstEmp = subEmpRes.body.employees[0];
    expect(firstEmp).toHaveProperty('employeeCode');
    expect(firstEmp).toHaveProperty('fullName');
    expect(firstEmp).toHaveProperty('employeeType');
    expect(firstEmp).not.toHaveProperty('currentSalary');
    expect(firstEmp).not.toHaveProperty('payrollFrequency');

    // Sub-Supervisor hitting financial endpoints -> 403
    const forbiddenChecks = await Promise.all([
      request(app).get('/api/v1/adjustments').set('Authorization', `Bearer ${subToken}`),
      request(app).get('/api/v1/payroll').set('Authorization', `Bearer ${subToken}`),
      request(app)
        .post('/api/v1/payroll/preview')
        .set('Authorization', `Bearer ${subToken}`)
        .send({ frequency: 'MONTHLY', year: 2026, month: 11 }),
      request(app).get('/api/v1/reports/payroll').set('Authorization', `Bearer ${subToken}`),
      request(app).get('/api/v1/dashboard/owner').set('Authorization', `Bearer ${subToken}`),
      request(app).get('/api/v1/audit-logs').set('Authorization', `Bearer ${subToken}`),
      request(app)
        .post(`/api/v1/employees/${firstEmp._id}/salary`)
        .set('Authorization', `Bearer ${subToken}`)
        .send({ salaryType: 'FIXED_MONTHLY', amount: 25000, effectiveFrom: '2026-11-01' }),
    ]);

    for (const r of forbiddenChecks) {
      expect(r.status).toBe(403);
    }

    // Supervisor can view employee salary details, but cannot edit salary or access payroll
    const supEmpRes = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(supEmpRes.status).toBe(200);
    expect(supEmpRes.body.employees[0]).toHaveProperty('currentSalary');

    const supMutateSalary = await request(app)
      .post(`/api/v1/employees/${firstEmp._id}/salary`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ salaryType: 'FIXED_MONTHLY', amount: 25000, effectiveFrom: '2026-11-01' });
    expect(supMutateSalary.status).toBe(403);
  });

  it('executes full 3-stage partial batch workflow, reopening, adjustments, payroll finalization, immutability, and PDF payslip', async () => {
    const empRes = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${ownerToken}`);
    const employees = empRes.body.employees;
    const monthlyDriver = employees.find(
      (e) => e.payrollFrequency === 'MONTHLY' && e.employeeType === 'DRIVER'
    );
    const weeklyDriver = employees.find(
      (e) => e.payrollFrequency === 'WEEKLY' && e.employeeType === 'DRIVER'
    );
    const cleaner = employees.find((e) => e.employeeType === 'CLEANER');

    // 1. Sub-Supervisor submits batch for 2026-11-18
    const createBatch = await request(app)
      .post('/api/v1/attendance/batches')
      .set('Authorization', `Bearer ${subToken}`)
      .send({
        attendanceDate: '2026-11-18',
        submitNow: true,
        entries: [
          { employeeId: monthlyDriver._id, status: 'PRESENT' },
          { employeeId: weeklyDriver._id, status: 'HALF_DAY' },
          { employeeId: cleaner._id, status: 'ABSENT' },
        ],
      });
    expect(createBatch.status).toBe(201);
    const batchId = createBatch.body.batch._id;

    // Duplicate attendance on same date must fail with 409
    const dupBatch = await request(app)
      .post('/api/v1/attendance/batches')
      .set('Authorization', `Bearer ${subToken}`)
      .send({
        attendanceDate: '2026-11-18',
        submitNow: true,
        entries: [{ employeeId: monthlyDriver._id, status: 'PRESENT' }],
      });
    expect(dupBatch.status).toBe(409);

    // Fetch batch details to get individual record IDs
    const detail1 = await request(app)
      .get(`/api/v1/attendance/batches/${batchId}`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    const records = detail1.body.records;
    const recMonthly = records.find((r) => r.employeeId._id === monthlyDriver._id);
    const recWeekly = records.find((r) => r.employeeId._id === weeklyDriver._id);
    const recCleaner = records.find((r) => r.employeeId._id === cleaner._id);

    // 2. Supervisor partially approves: approves monthlyDriver & weeklyDriver, returns cleaner with reason
    const supReview = await request(app)
      .post(`/api/v1/attendance/batches/${batchId}/supervisor-review`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        actions: [
          { attendanceId: recMonthly._id, decision: 'APPROVE' },
          { attendanceId: recWeekly._id, decision: 'APPROVE' },
          { attendanceId: recCleaner._id, decision: 'RETURN', reason: 'Cleaner reported late, verify shift' },
        ],
      });
    expect(supReview.status).toBe(200);
    expect(supReview.body.batch.status).toBe('SUPERVISOR_PARTIAL_REVIEW');

    // 3. Owner approves the Supervisor-approved records without waiting for the returned cleaner record
    const ownerReview1 = await request(app)
      .post(`/api/v1/attendance/batches/${batchId}/owner-review`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ approveRemaining: true });
    expect(ownerReview1.status).toBe(200);

    // Test reopening without reason -> 400
    const reopenNoReason = await request(app)
      .post(`/api/v1/attendance/records/${recMonthly._id}/reopen`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: '' });
    expect(reopenNoReason.status).toBe(400);

    // Sub-Supervisor fixes and resubmits the returned cleaner record
    const fixResubmit = await request(app)
      .put(`/api/v1/attendance/batches/${batchId}`)
      .set('Authorization', `Bearer ${subToken}`)
      .send({
        submitNow: true,
        updates: [{ attendanceId: recCleaner._id, status: 'PRESENT', notes: 'Verified morning shift' }],
      });
    expect(fixResubmit.status).toBe(200);

    await request(app)
      .post(`/api/v1/attendance/batches/${batchId}/supervisor-review`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ approveRemaining: true });

    await request(app)
      .post(`/api/v1/attendance/batches/${batchId}/owner-review`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ approveRemaining: true });

    // 4. Owner adds attendance-stage Mileage allowance + payroll-stage Bonus for monthlyDriver
    const adj1 = await request(app)
      .post('/api/v1/adjustments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        employeeId: monthlyDriver._id,
        stage: 'ATTENDANCE_APPROVAL',
        category: 'MILEAGE',
        name: 'Express Route Mileage',
        type: 'EARNING',
        amount: 600,
        applicableDate: '2026-11-18',
        attendanceId: recMonthly._id,
      });
    expect(adj1.status).toBe(201);

    const adj2 = await request(app)
      .post('/api/v1/adjustments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        employeeId: monthlyDriver._id,
        stage: 'PAYROLL_PROCESSING',
        category: 'BONUS',
        name: 'Punctuality Bonus',
        type: 'EARNING',
        amount: 1000,
        applicableDate: '2026-11-25',
      });
    expect(adj2.status).toBe(201);

    // 5. Preview Monthly Payroll (2026-11)
    const previewRes = await request(app)
      .post('/api/v1/payroll/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ frequency: 'MONTHLY', year: 2026, month: 11 });
    expect(previewRes.status).toBe(200);
    const payrollId = previewRes.body.payroll._id;
    const driverItem = previewRes.body.items.find((i) => i.employeeId === monthlyDriver._id);
    expect(driverItem).toBeTruthy();
    expect(driverItem.earnings.totalAdjustments).toBe(1600);
    expect(driverItem.netPayable).toBe(24000 + 1600);

    // 6. Finalize Monthly Payroll
    const finalizeRes = await request(app)
      .post(`/api/v1/payroll/${payrollId}/finalize`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(finalizeRes.status).toBe(200);
    expect(finalizeRes.body.payroll.status).toBe('FINALIZED');
    const finalizedItem = finalizeRes.body.items.find((i) => i.employeeId === monthlyDriver._id);
    expect(finalizedItem.payslipNumber).toContain('PS-2026-11-');

    // Re-preview finalized payroll must fail with 409
    const rePreview = await request(app)
      .post('/api/v1/payroll/preview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ frequency: 'MONTHLY', year: 2026, month: 11 });
    expect(rePreview.status).toBe(409);

    // Reopening locked attendance must fail with 409
    const reopenLocked = await request(app)
      .post(`/api/v1/attendance/records/${recMonthly._id}/reopen`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Attempt to mutate finalized period' });
    expect(reopenLocked.status).toBe(409);

    // Updating employee salary afterwards must NOT alter historical PayrollItem snapshot
    await request(app)
      .post(`/api/v1/employees/${monthlyDriver._id}/salary`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ salaryType: 'FIXED_MONTHLY', amount: 30000, effectiveFrom: '2026-12-01' });

    const historicalRes = await request(app)
      .get(`/api/v1/payroll/${payrollId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const histItem = historicalRes.body.items.find((i) => i.employeeId === monthlyDriver._id);
    expect(histItem.salaryStructureSnapshot.baseAmount).toBe(24000);
    expect(histItem.netPayable).toBe(25600);

    // 7. Download PDF Payslip
    const pdfRes = await request(app)
      .get(`/api/v1/payroll/items/${finalizedItem._id}/payslip.pdf`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    expect(pdfRes.body.toString('utf8', 0, 4)).toBe('%PDF');
  });
});
