import PDFDocument from 'pdfkit';

function money(symbol, value) {
  return `${symbol}${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generatePayslipPdfBuffer(payroll, item) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const company = item.companySnapshot || {};
    const emp = item.employeeSnapshot || {};
    const att = item.attendanceSummary || {};
    const sym = company.currencySymbol === '₹' ? 'INR ' : `${company.currencySymbol || 'INR '} `;

    // Header
    doc.rect(40, 40, 515, 70).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(company.companyName || 'V-Bus Transport Operations', 56, 54);
    doc.fontSize(9).font('Helvetica').fillColor('#cbd5e1').text(company.companyAddress || '', 56, 75, { width: 320 });
    doc.fillColor('#38bdf8').fontSize(12).font('Helvetica-Bold').text('PAYSLIP', 430, 54, { align: 'right', width: 110 });
    doc.fillColor('#e2e8f0').fontSize(9).font('Helvetica').text(item.payslipNumber || payroll.payrollCode, 410, 72, { align: 'right', width: 130 });

    // Employee & Period Details
    let y = 128;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('EMPLOYEE DETAILS', 40, y);
    doc.text('PAYROLL PERIOD', 320, y);
    y += 16;

    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    doc.text(`Employee ID: ${emp.employeeCode}`, 40, y);
    doc.text(`Frequency: ${emp.payrollFrequency}`, 320, y);
    y += 14;
    doc.text(`Employee Name: ${emp.fullName}`, 40, y);
    doc.text(`Period: ${payroll.periodStartKey} to ${payroll.periodEndKey}`, 320, y);
    y += 14;
    doc.text(`Role / Type: ${emp.employeeType}`, 40, y);
    doc.text(`Payroll Code: ${payroll.payrollCode}`, 320, y);
    y += 22;

    // Attendance Summary Box
    doc.rect(40, y, 515, 48).strokeColor('#cbd5e1').lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('ATTENDANCE SUMMARY', 50, y + 8);
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text(
      `Total Days: ${att.totalPeriodDays}   |   Present: ${att.presentDays}   |   Absent: ${att.absentDays}   |   Half Day: ${att.halfDays}   |   Paid Leave: ${att.paidLeaveDays}   |   Unpaid Leave: ${att.unpaidLeaveDays}`,
      50,
      y + 24
    );
    y += 66;

    // Two-column Earnings & Deductions Table
    const col1X = 40;
    const col2X = 305;
    const colW = 250;

    doc.rect(col1X, y, colW, 22).fill('#f1f5f9');
    doc.rect(col2X, y, colW, 22).fill('#f1f5f9');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5);
    doc.text('EARNINGS', col1X + 10, y + 6);
    doc.text('DEDUCTIONS', col2X + 10, y + 6);
    y += 28;

    const earningLines = [
      {
        label: `Base Salary (${item.salaryStructureSnapshot?.salaryType || ''})`,
        amount: item.earnings.fixedSalaryComponent,
      },
      ...(item.earnings.adjustments || []).map((a) => ({
        label: a.name,
        amount: a.amount,
      })),
    ];

    const deductionLines = [];
    if (item.deductions.absentDeduction > 0) {
      deductionLines.push({ label: 'Absent Deduction', amount: item.deductions.absentDeduction });
    }
    if (item.deductions.halfDayDeduction > 0) {
      deductionLines.push({ label: 'Half-Day Deduction', amount: item.deductions.halfDayDeduction });
    }
    if (item.deductions.unpaidLeaveDeduction > 0) {
      deductionLines.push({ label: 'Unpaid Leave Deduction', amount: item.deductions.unpaidLeaveDeduction });
    }
    for (const adj of item.deductions.adjustments || []) {
      deductionLines.push({ label: adj.name, amount: adj.amount });
    }
    if (!deductionLines.length) {
      deductionLines.push({ label: 'No Deductions', amount: 0 });
    }

    const maxRows = Math.max(earningLines.length, deductionLines.length);
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    for (let i = 0; i < maxRows; i += 1) {
      if (earningLines[i]) {
        doc.text(earningLines[i].label, col1X + 10, y, { width: 150 });
        doc.text(money(sym, earningLines[i].amount), col1X + 165, y, { width: 75, align: 'right' });
      }
      if (deductionLines[i]) {
        doc.text(deductionLines[i].label, col2X + 10, y, { width: 150 });
        doc.text(money(sym, deductionLines[i].amount), col2X + 165, y, { width: 75, align: 'right' });
      }
      y += 18;
    }

    y += 10;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').stroke();
    y += 12;

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a');
    doc.text('Gross Earnings', col1X + 10, y);
    doc.text(money(sym, item.earnings.grossEarnings), col1X + 165, y, { width: 75, align: 'right' });
    doc.text('Total Deductions', col2X + 10, y);
    doc.text(money(sym, item.deductions.totalDeductions), col2X + 165, y, { width: 75, align: 'right' });
    y += 28;

    // Net Payable Banner
    doc.rect(40, y, 515, 42).fill('#ecfdf5').strokeColor('#10b981').stroke();
    doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(12).text('NET PAYABLE SALARY', 56, y + 13);
    doc.fontSize(14).text(money(sym, item.netPayable), 340, y + 12, { width: 200, align: 'right' });

    y += 64;
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(
      `Generated on ${new Date(payroll.finalizedAt || Date.now()).toISOString().slice(0, 10)} • System-generated immutable payslip snapshot.`,
      40,
      y,
      { align: 'center', width: 515 }
    );

    doc.end();
  });
}
