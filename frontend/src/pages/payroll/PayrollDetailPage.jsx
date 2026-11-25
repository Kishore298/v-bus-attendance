import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, Lock, Printer } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { payrollApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { StatCard, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { downloadBlob, formatCurrency, getErrorMessage } from '../../utils/format';

export function PayrollDetailPage() {
  const { id } = useParams();
  const [payroll, setPayroll] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollApi.get(id);
      setPayroll(res.payroll);
      setItems(res.items || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFinalize = async () => {
    if (
      !window.confirm(
        'Finalize this payroll? All included attendance records and adjustments will be locked and cannot be modified afterward.'
      )
    ) {
      return;
    }
    setFinalizing(true);
    try {
      await payrollApi.finalize(id);
      toast.success('Payroll finalized and payslips generated!');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadPdf = async (item) => {
    try {
      const blob = await payrollApi.downloadPayslipPdf(item._id);
      downloadBlob(blob, `${item.payslipNumber || item.employeeSnapshot.employeeCode}-payslip.pdf`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <TableSkeleton rows={6} />;
  if (!payroll) return null;

  const isFinalized = payroll.status === 'FINALIZED';

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div className="flex items-center gap-3">
          <Link to="/payroll" className="p-2.5 rounded-xl bg-white border border-orange-100 hover:bg-orange-50 text-slate-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{payroll.payrollCode}</h1>
              <StatusBadge status={payroll.frequency} />
              <StatusBadge status={payroll.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Period: <strong className="text-slate-800">{payroll.periodStartKey}</strong> to{' '}
              <strong className="text-slate-800">{payroll.periodEndKey}</strong> • {items.length} employee(s)
            </p>
          </div>
        </div>

        {!isFinalized ? (
          <button
            type="button"
            disabled={finalizing || items.length === 0}
            onClick={handleFinalize}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 orange-gradient-btn text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {finalizing ? 'Finalizing...' : 'Finalize Payroll & Lock'}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 text-orange-800 text-xs font-bold border border-orange-200">
            <Lock className="w-3.5 h-3.5 text-orange-600" /> Immutable Finalized Snapshot
          </span>
        )}
      </div>

      {/* Totals Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Employees" value={payroll.totals?.employeeCount || 0} tone="orange" />
        <StatCard title="Gross Earnings" value={formatCurrency(payroll.totals?.grossEarnings)} tone="blue" />
        <StatCard title="Total Deductions" value={formatCurrency(payroll.totals?.totalDeductions)} tone="rose" />
        <StatCard title="Net Payable" value={formatCurrency(payroll.totals?.netPayable)} tone="emerald" />
      </div>

      {/* Employee Breakdown Table */}
      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Attendance</th>
                <th className="px-5 py-3.5">Base Salary</th>
                <th className="px-5 py-3.5">Benefits / Extras</th>
                <th className="px-5 py-3.5">Deductions</th>
                <th className="px-5 py-3.5">Net Payable</th>
                <th className="px-5 py-3.5 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900">{item.employeeSnapshot.fullName}</p>
                    <p className="text-xs font-mono text-slate-500">
                      {item.employeeSnapshot.employeeCode} • {item.employeeSnapshot.employeeType}
                    </p>
                    {item.warnings?.length > 0 && (
                      <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {item.warnings[0]}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">
                      {item.attendanceSummary.payableDays} / {item.attendanceSummary.totalPeriodDays} payable days
                    </p>
                    <p className="text-[11px] text-slate-500">
                      P:{item.attendanceSummary.presentDays} A:{item.attendanceSummary.absentDays} H:
                      {item.attendanceSummary.halfDays} PL:{item.attendanceSummary.paidLeaveDays} UL:
                      {item.attendanceSummary.unpaidLeaveDays}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 font-semibold">
                    {formatCurrency(item.earnings.fixedSalaryComponent)}
                    <span className="block text-[11px] text-slate-500 font-normal">
                      @ {formatCurrency(item.salaryStructureSnapshot.perDayRate)}/day
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-emerald-700 font-bold">
                    +{formatCurrency(item.earnings.totalAdjustments)}
                  </td>
                  <td className="px-5 py-3.5 text-rose-600 font-bold">
                    -{formatCurrency(item.deductions.totalDeductions)}
                  </td>
                  <td className="px-5 py-3.5 font-extrabold text-slate-900">{formatCurrency(item.netPayable)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-orange-200 text-orange-800 bg-orange-50/50 rounded-xl hover:bg-orange-100 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold orange-gradient-btn text-white rounded-xl cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Preview & Print Modal */}
      <Modal
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title={`Payslip ${previewItem?.payslipNumber || '(Draft Preview)'}`}
        maxWidth="max-w-2xl"
      >
        {previewItem && (
          <div className="space-y-4 text-sm">
            <div className="bg-gradient-to-r from-white via-orange-50/60 to-orange-100/60 border border-orange-200 p-4 rounded-2xl flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="V Bus Holidays" className="h-12 w-auto object-contain bg-white rounded-xl p-1 border border-orange-100" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{previewItem.companySnapshot.companyName}</h3>
                  <p className="text-xs text-slate-600">{previewItem.companySnapshot.companyAddress}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-orange-600 font-extrabold tracking-wider">PAYSLIP</p>
                <p className="text-xs font-mono text-slate-700">{previewItem.payslipNumber || payroll.payrollCode}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-orange-50/40 p-4 rounded-xl border border-orange-100 text-xs">
              <div className="space-y-1">
                <p><strong>ID:</strong> {previewItem.employeeSnapshot.employeeCode}</p>
                <p><strong>Name:</strong> {previewItem.employeeSnapshot.fullName}</p>
                <p><strong>Type:</strong> {previewItem.employeeSnapshot.employeeType}</p>
              </div>
              <div className="space-y-1">
                <p><strong>Frequency:</strong> {previewItem.employeeSnapshot.payrollFrequency}</p>
                <p><strong>Period:</strong> {payroll.periodStartKey} to {payroll.periodEndKey}</p>
                <p><strong>Payable Days:</strong> {previewItem.attendanceSummary.payableDays} / {previewItem.attendanceSummary.totalPeriodDays}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-orange-100 rounded-xl p-4 bg-white">
                <h4 className="text-xs font-extrabold uppercase text-orange-700 mb-2.5">Earnings</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span>Base Salary</span>
                    <span className="font-semibold">{formatCurrency(previewItem.earnings.fixedSalaryComponent)}</span>
                  </div>
                  {(previewItem.earnings.adjustments || []).map((a) => (
                    <div key={a.adjustmentCode} className="flex justify-between text-emerald-700">
                      <span>{a.name}</span>
                      <span className="font-semibold">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-2 mt-2 text-slate-900">
                    <span>Gross Earnings</span>
                    <span>{formatCurrency(previewItem.earnings.grossEarnings)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-orange-100 rounded-xl p-4 bg-white">
                <h4 className="text-xs font-extrabold uppercase text-rose-700 mb-2.5">Deductions</h4>
                <div className="space-y-1.5 text-xs">
                  {previewItem.deductions.absentDeduction > 0 && (
                    <div className="flex justify-between">
                      <span>Absent Deduction</span>
                      <span className="font-semibold">{formatCurrency(previewItem.deductions.absentDeduction)}</span>
                    </div>
                  )}
                  {previewItem.deductions.halfDayDeduction > 0 && (
                    <div className="flex justify-between">
                      <span>Half-Day Deduction</span>
                      <span className="font-semibold">{formatCurrency(previewItem.deductions.halfDayDeduction)}</span>
                    </div>
                  )}
                  {previewItem.deductions.unpaidLeaveDeduction > 0 && (
                    <div className="flex justify-between">
                      <span>Unpaid Leave Deduction</span>
                      <span className="font-semibold">{formatCurrency(previewItem.deductions.unpaidLeaveDeduction)}</span>
                    </div>
                  )}
                  {(previewItem.deductions.adjustments || []).map((a) => (
                    <div key={a.adjustmentCode} className="flex justify-between text-rose-600">
                      <span>{a.name}</span>
                      <span className="font-semibold">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-2 mt-2 text-slate-900">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(previewItem.deductions.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl p-4 flex items-center justify-between shadow-sm">
              <span className="font-extrabold tracking-wide">NET PAYABLE SALARY</span>
              <span className="text-xl font-extrabold">{formatCurrency(previewItem.netPayable)}</span>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-orange-200 text-slate-700 rounded-xl hover:bg-orange-50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(previewItem)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold orange-gradient-btn text-white rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
