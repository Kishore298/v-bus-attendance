import { Play, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { payrollApi } from '../../api/endpoints';
import { EmptyState, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate, getErrorMessage, todayDateKey } from '../../utils/format';

export function PayrollPage() {
  const navigate = useNavigate();
  const [frequency, setFrequency] = useState('MONTHLY');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [weekStartKey, setWeekStartKey] = useState(todayDateKey);

  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollApi.list();
      setPayrolls(res.payrolls || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const payload =
        frequency === 'MONTHLY'
          ? { frequency, year: Number(year), month: Number(month) }
          : { frequency, weekStartKey };
      const res = await payrollApi.preview(payload);
      toast.success(`Payroll preview ready: ${res.payroll.payrollCode}`);
      navigate(`/payroll/${res.payroll._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-2xl p-5 bg-gradient-to-r from-white to-orange-50/40">
        <h1 className="text-xl font-extrabold text-slate-900">Payroll Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate weekly or monthly payroll previews from owner-approved attendance, finalize, and issue PDF payslips
        </p>
      </div>

      {/* Generator Card */}
      <form
        onSubmit={handleGeneratePreview}
        className="premium-card rounded-2xl p-6 flex flex-wrap items-end gap-4 bg-gradient-to-br from-white via-white to-orange-50/30"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Payroll Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-orange-200 rounded-xl bg-white font-semibold"
          >
            <option value="MONTHLY">Monthly Payroll</option>
            <option value="WEEKLY">Weekly Payroll</option>
          </select>
        </div>

        {frequency === 'MONTHLY' ? (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-28 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white font-semibold"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString('en', { month: 'long' })} ({i + 1})
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Week Start Date (7-day period)</label>
            <input
              type="date"
              value={weekStartKey}
              onChange={(e) => setWeekStartKey(e.target.value)}
              className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl font-semibold"
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={generating}
          className="inline-flex items-center gap-2 px-5 py-2.5 orange-gradient-btn text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-60"
        >
          <Play className="w-4 h-4" />
          {generating ? 'Calculating...' : 'Generate / Refresh Preview'}
        </button>
      </form>

      {/* Historical Payroll List */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : payrolls.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payroll runs yet"
          description="Select a weekly or monthly period above to generate a payroll preview."
        />
      ) : (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100/80">
            <h2 className="text-sm font-bold text-slate-900">Payroll History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Payroll Code</th>
                  <th className="px-5 py-3.5">Frequency</th>
                  <th className="px-5 py-3.5">Period</th>
                  <th className="px-5 py-3.5">Employees</th>
                  <th className="px-5 py-3.5">Gross</th>
                  <th className="px-5 py-3.5">Deductions</th>
                  <th className="px-5 py-3.5">Net Payable</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map((p) => (
                  <tr key={p._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-orange-700">{p.payrollCode}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.frequency} /></td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {p.periodStartKey} → {p.periodEndKey}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{p.totals?.employeeCount || 0}</td>
                    <td className="px-5 py-3.5">{formatCurrency(p.totals?.grossEarnings)}</td>
                    <td className="px-5 py-3.5 text-rose-600 font-medium">{formatCurrency(p.totals?.totalDeductions)}</td>
                    <td className="px-5 py-3.5 font-extrabold text-emerald-700">{formatCurrency(p.totals?.netPayable)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status} />
                      {p.finalizedAt && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {formatDate(p.finalizedAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/payroll/${p._id}`}
                        className="inline-block px-3.5 py-1.5 text-xs font-bold orange-gradient-btn text-white rounded-xl"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
