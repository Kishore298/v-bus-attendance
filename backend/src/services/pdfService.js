import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_CANDIDATES = [
  path.resolve(__dirname, '../../../frontend/public/logo.png'),
  path.resolve(__dirname, '../assets/logo.png'),
];

function resolveLogoPath() {
  return LOGO_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

function money(symbol, value) {
  return `${symbol}${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n) {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function integerToIndianWords(num) {
  if (num === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const rest = num % 100;

  if (crore) parts.push(`${integerToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(' ');
}

function amountToWords(amount) {
  const rounded = Math.round(Number(amount || 0) * 100);
  const rupees = Math.floor(rounded / 100);
  const paise = rounded % 100;
  const rupeePart = `Rupees ${integerToIndianWords(rupees)}`;
  if (paise > 0) {
    return `${rupeePart} and ${twoDigitsToWords(paise)} Paise Only`;
  }
  return `${rupeePart} Only`;
}

/**
 * Draws a rounded card with a clipped header band so rounded corners stay crisp.
 */
function drawTitledCard(doc, { x, y, w, h, radius = 8, headerH = 24, headerFill, headerTextColor, borderColor, title }) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).clip();
  doc.rect(x, y, w, h).fill('#ffffff');
  doc.rect(x, y, w, headerH).fill(headerFill);
  doc.restore();

  doc
    .moveTo(x, y + headerH)
    .lineTo(x + w, y + headerH)
    .strokeColor(borderColor)
    .lineWidth(0.75)
    .stroke();

  doc.roundedRect(x, y, w, h, radius).strokeColor(borderColor).lineWidth(1).stroke();

  doc
    .fillColor(headerTextColor)
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(title, x + 14, y + 8, { width: w - 28 });
}

function drawKeyValueRow(doc, { x, y, w, label, value, boldValue = true, divider = true }) {
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#64748b')
    .text(label, x + 14, y, { width: w * 0.48 });

  doc
    .font(boldValue ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(8.8)
    .fillColor('#0f172a')
    .text(String(value || '—'), x + w * 0.44, y, {
      width: w * 0.56 - 14,
      align: 'right',
    });

  if (divider) {
    doc
      .moveTo(x + 14, y + 15)
      .lineTo(x + w - 14, y + 15)
      .strokeColor('#f1f5f9')
      .lineWidth(0.75)
      .stroke();
  }
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
    const sal = item.salaryStructureSnapshot || {};
    const sym = company.currencySymbol === '₹' ? 'INR ' : `${company.currencySymbol || 'INR '} `;
    const logoPath = resolveLogoPath();

    const pageLeft = 40;
    const pageWidth = 515;
    const displayCompanyName =
      !company.companyName || company.companyName === 'V-Bus Transport Operations'
        ? 'V Bus Holidays'
        : company.companyName;

    // Outer subtle page frame
    doc
      .roundedRect(28, 28, 539, 786, 10)
      .fillAndStroke('#ffffff', '#f3e8d8');

    // Top Header Card with clipped orange top accent bar
    const headerY = 42;
    const headerH = 92;
    doc.save();
    doc.roundedRect(pageLeft, headerY, pageWidth, headerH, 8).clip();
    doc.rect(pageLeft, headerY, pageWidth, headerH).fill('#fffbf5');
    doc.rect(pageLeft, headerY, pageWidth, 5).fill('#f97316');
    doc.restore();
    doc.roundedRect(pageLeft, headerY, pageWidth, headerH, 8).strokeColor('#fed7aa').lineWidth(1).stroke();

    let textStartX = pageLeft + 16;
    if (logoPath) {
      doc
        .roundedRect(pageLeft + 14, headerY + 15, 68, 64, 8)
        .fillAndStroke('#ffffff', '#fed7aa');
      doc.image(logoPath, pageLeft + 18, headerY + 19, {
        fit: [60, 56],
        align: 'center',
        valign: 'center',
      });
      textStartX = pageLeft + 94;
    }

    doc
      .fillColor('#0f172a')
      .fontSize(17)
      .font('Helvetica-Bold')
      .text(displayCompanyName, textStartX, headerY + 20, { width: 225 });

    doc
      .fontSize(8.2)
      .font('Helvetica')
      .fillColor('#ea580c')
      .text('CONNECTING TO CITY • FLEET OPERATIONS', textStartX, headerY + 41, { width: 225 });

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        company.companyAddress || 'Central Bus Depot, NH-48 Highway, Transport Nagar',
        textStartX,
        headerY + 55,
        { width: 225 }
      );

    // Right Payslip Pill & Metadata
    const pillW = 166;
    const pillX = pageLeft + pageWidth - pillW - 14;
    doc.roundedRect(pillX, headerY + 16, pillW, 24, 5).fill('#f97316');
    doc
      .fillColor('#ffffff')
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text('SALARY PAYSLIP', pillX, headerY + 23, { width: pillW, align: 'center' });

    doc
      .fillColor('#9a3412')
      .fontSize(8.3)
      .font('Helvetica-Bold')
      .text(item.payslipNumber || payroll.payrollCode, pillX - 24, headerY + 48, {
        width: pillW + 24,
        align: 'right',
      });

    doc
      .fillColor('#475569')
      .fontSize(7.8)
      .font('Helvetica')
      .text(`Pay Period: ${payroll.periodStartKey} to ${payroll.periodEndKey}`, pillX - 24, headerY + 62, {
        width: pillW + 24,
        align: 'right',
      });

    doc
      .fillColor('#64748b')
      .fontSize(7.5)
      .text(`Status: ${payroll.status === 'FINALIZED' ? 'FINALIZED & LOCKED' : 'DRAFT PREVIEW'}`, pillX - 24, headerY + 74, {
        width: pillW + 24,
        align: 'right',
      });

    // Section 1: Employee & Payroll Two-Column Cards
    let y = 152;
    const cardW = 250;
    const rightCardX = pageLeft + 265;
    const infoCardH = 104;

    drawTitledCard(doc, {
      x: pageLeft,
      y,
      w: cardW,
      h: infoCardH,
      headerFill: '#fff7ed',
      headerTextColor: '#c2410c',
      borderColor: '#fed7aa',
      title: 'EMPLOYEE DETAILS',
    });
    drawTitledCard(doc, {
      x: rightCardX,
      y,
      w: cardW,
      h: infoCardH,
      headerFill: '#fff7ed',
      headerTextColor: '#c2410c',
      borderColor: '#fed7aa',
      title: 'PAYROLL & RATE SUMMARY',
    });

    drawKeyValueRow(doc, { x: pageLeft, y: y + 32, w: cardW, label: 'Employee ID', value: emp.employeeCode });
    drawKeyValueRow(doc, { x: pageLeft, y: y + 52, w: cardW, label: 'Full Name', value: emp.fullName });
    drawKeyValueRow(doc, { x: pageLeft, y: y + 72, w: cardW, label: 'Designation', value: emp.employeeType, divider: false });

    drawKeyValueRow(doc, { x: rightCardX, y: y + 32, w: cardW, label: 'Pay Frequency', value: emp.payrollFrequency });
    drawKeyValueRow(doc, {
      x: rightCardX,
      y: y + 52,
      w: cardW,
      label: 'Salary Basis',
      value: (sal.salaryType || '').replace(/_/g, ' '),
    });
    drawKeyValueRow(doc, {
      x: rightCardX,
      y: y + 72,
      w: cardW,
      label: 'Daily Rate',
      value: `${money(sym, sal.perDayRate)} / day`,
      divider: false,
    });

    y += infoCardH + 16;

    // Section 2: Attendance Summary Strip (7 metric pills including Payable Days)
    const attCardH = 74;
    drawTitledCard(doc, {
      x: pageLeft,
      y,
      w: pageWidth,
      h: attCardH,
      headerFill: '#fff7ed',
      headerTextColor: '#c2410c',
      borderColor: '#fed7aa',
      title: 'ATTENDANCE BREAKDOWN',
    });

    const attMetrics = [
      { label: 'Total Days', val: att.totalPeriodDays ?? 0, bg: '#f8fafc', border: '#e2e8f0', text: '#0f172a' },
      { label: 'Present', val: att.presentDays ?? 0, bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
      { label: 'Absent', val: att.absentDays ?? 0, bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },
      { label: 'Half Day', val: att.halfDays ?? 0, bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
      { label: 'Paid Leave', val: att.paidLeaveDays ?? 0, bg: '#f0f9ff', border: '#bae6fd', text: '#075985' },
      { label: 'Unpaid Lv', val: att.unpaidLeaveDays ?? 0, bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },
      { label: 'Payable Days', val: att.payableDays ?? 0, bg: '#fff7ed', border: '#fdba74', text: '#c2410c' },
    ];
    const pillGap = 6;
    const innerPad = 12;
    const tileW = (pageWidth - innerPad * 2 - pillGap * (attMetrics.length - 1)) / attMetrics.length;

    attMetrics.forEach((m, idx) => {
      const bx = pageLeft + innerPad + idx * (tileW + pillGap);
      doc.roundedRect(bx, y + 32, tileW, 32, 5).fillAndStroke(m.bg, m.border);
      doc
        .font('Helvetica')
        .fontSize(6.8)
        .fillColor('#64748b')
        .text(m.label, bx, y + 36, { width: tileW, align: 'center' });
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(m.text)
        .text(String(m.val), bx, y + 48, { width: tileW, align: 'center' });
    });

    y += attCardH + 16;

    // Section 3: Earnings & Deductions Cards (clipped rounded headers!)
    const earningLines = [
      {
        label: `Base Salary (${(sal.salaryType || '').replace(/_/g, ' ')})`,
        amount: item.earnings.fixedSalaryComponent,
      },
      ...(item.earnings.adjustments || []).map((a) => ({
        label: a.name,
        amount: a.amount,
      })),
    ];

    const deductionLines = [];
    if (item.deductions.absentDeduction > 0) {
      deductionLines.push({ label: `Absent Deduction (${att.absentDays}d)`, amount: item.deductions.absentDeduction });
    }
    if (item.deductions.halfDayDeduction > 0) {
      deductionLines.push({ label: `Half-Day Deduction (${att.halfDays}d)`, amount: item.deductions.halfDayDeduction });
    }
    if (item.deductions.unpaidLeaveDeduction > 0) {
      deductionLines.push({ label: `Unpaid Leave (${att.unpaidLeaveDays}d)`, amount: item.deductions.unpaidLeaveDeduction });
    }
    for (const adj of item.deductions.adjustments || []) {
      deductionLines.push({ label: adj.name, amount: adj.amount });
    }
    if (!deductionLines.length) {
      deductionLines.push({ label: 'No Deductions', amount: 0 });
    }

    const maxRows = Math.max(earningLines.length, deductionLines.length, 3);
    const tableH = 34 + maxRows * 22 + 34;

    drawTitledCard(doc, {
      x: pageLeft,
      y,
      w: cardW,
      h: tableH,
      headerFill: '#fff7ed',
      headerTextColor: '#c2410c',
      borderColor: '#fed7aa',
      title: 'EARNINGS',
    });
    drawTitledCard(doc, {
      x: rightCardX,
      y,
      w: cardW,
      h: tableH,
      headerFill: '#fff1f2',
      headerTextColor: '#be123c',
      borderColor: '#fecdd3',
      title: 'DEDUCTIONS',
    });

    let rowY = y + 34;
    for (let i = 0; i < maxRows; i += 1) {
      if (earningLines[i]) {
        doc
          .font('Helvetica')
          .fontSize(8.6)
          .fillColor('#334155')
          .text(earningLines[i].label, pageLeft + 14, rowY, { width: 142 });
        doc
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(money(sym, earningLines[i].amount), pageLeft + 158, rowY, { width: 78, align: 'right' });
      }
      if (deductionLines[i]) {
        doc
          .font('Helvetica')
          .fontSize(8.6)
          .fillColor('#334155')
          .text(deductionLines[i].label, rightCardX + 14, rowY, { width: 142 });
        doc
          .font('Helvetica-Bold')
          .fillColor(deductionLines[i].amount > 0 ? '#be123c' : '#64748b')
          .text(money(sym, deductionLines[i].amount), rightCardX + 158, rowY, { width: 78, align: 'right' });
      }
      rowY += 22;
    }

    const totalRowY = y + tableH - 24;
    doc.save();
    doc.roundedRect(pageLeft, y + tableH - 32, cardW, 32, 8).clip();
    doc.rect(pageLeft, y + tableH - 32, cardW, 32).fill('#fffbf5');
    doc.restore();
    doc.save();
    doc.roundedRect(rightCardX, y + tableH - 32, cardW, 32, 8).clip();
    doc.rect(rightCardX, y + tableH - 32, cardW, 32).fill('#fff8f8');
    doc.restore();

    // Re-stroke borders cleanly over bottom fills
    doc.roundedRect(pageLeft, y, cardW, tableH, 8).strokeColor('#fed7aa').lineWidth(1).stroke();
    doc.roundedRect(rightCardX, y, cardW, tableH, 8).strokeColor('#fecdd3').lineWidth(1).stroke();

    doc
      .moveTo(pageLeft, y + tableH - 32)
      .lineTo(pageLeft + cardW, y + tableH - 32)
      .strokeColor('#fed7aa')
      .lineWidth(0.75)
      .stroke();
    doc
      .moveTo(rightCardX, y + tableH - 32)
      .lineTo(rightCardX + cardW, y + tableH - 32)
      .strokeColor('#fecdd3')
      .lineWidth(0.75)
      .stroke();

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
    doc.text('Gross Earnings', pageLeft + 14, totalRowY);
    doc.fillColor('#c2410c').text(money(sym, item.earnings.grossEarnings), pageLeft + 158, totalRowY, {
      width: 78,
      align: 'right',
    });

    doc.fillColor('#0f172a').text('Total Deductions', rightCardX + 14, totalRowY);
    doc.fillColor('#be123c').text(money(sym, item.deductions.totalDeductions), rightCardX + 158, totalRowY, {
      width: 78,
      align: 'right',
    });

    y += tableH + 18;

    // Section 4: Executive Net Payable Summary Card (with clipped orange left pillar + amount in words)
    const netH = 70;
    doc.save();
    doc.roundedRect(pageLeft, y, pageWidth, netH, 8).clip();
    doc.rect(pageLeft, y, pageWidth, netH).fill('#fff7ed');
    doc.rect(pageLeft, y, 8, netH).fill('#ea580c');
    doc.restore();
    doc.roundedRect(pageLeft, y, pageWidth, netH, 8).strokeColor('#fb923c').lineWidth(1.2).stroke();

    doc
      .fillColor('#c2410c')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('NET PAYABLE SALARY', pageLeft + 22, y + 15);

    doc
      .fillColor('#334155')
      .font('Helvetica')
      .fontSize(8.2)
      .text(`In Words: ${amountToWords(item.netPayable)}`, pageLeft + 22, y + 32, { width: 295 });

    doc
      .fillColor('#9a3412')
      .font('Helvetica-Bold')
      .fontSize(19)
      .text(money(sym, item.netPayable), pageLeft + 315, y + 22, {
        width: 184,
        align: 'right',
      });

    // Section 5: Bottom Signatory & Authenticity Footer
    const sigY = 716;
    doc
      .moveTo(pageLeft, sigY)
      .lineTo(pageLeft + pageWidth, sigY)
      .strokeColor('#f1e4d3')
      .lineWidth(0.75)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text(`Payroll Reference: ${payroll.payrollCode}`, pageLeft, sigY + 12)
      .text(
        `Generated: ${new Date(payroll.finalizedAt || Date.now()).toISOString().slice(0, 10)}`,
        pageLeft,
        sigY + 25
      );

    doc
      .moveTo(pageLeft + pageWidth - 165, sigY + 30)
      .lineTo(pageLeft + pageWidth, sigY + 30)
      .strokeColor('#cbd5e1')
      .lineWidth(0.75)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#334155')
      .text('Authorized Signatory', pageLeft + pageWidth - 165, sigY + 35, {
        width: 165,
        align: 'center',
      });

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#94a3b8')
      .text(
        `${displayCompanyName} • Computer-generated immutable payslip snapshot. No alteration permitted.`,
        pageLeft,
        782,
        { align: 'center', width: pageWidth }
      );

    doc.end();
  });
}
