import { Download, FileBarChart2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { reportApi } from '../../api/endpoints';
import { EmptyState, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { downloadBlob, formatCurrency, getErrorMessage } from '../../utils/format';

export function ReportsPage() {
  const { user } = useSelector((s) => s.auth);
  const role = user.role;

  const availableTabs = [
    { key: 'attendance', label: 'Attendance Report' },
    ...(role !== 'SUB_SUPERVISOR'
      ? [{ key: 'supervisor-review', label: 'Supervisor Review Report' }]
      : []),
    ...(role === 'OWNER'
      ? [
          { key: 'payroll', label: 'Payroll Report' },
          { key: 'adjustments', label: 'Benefits & Deductions' },
        ]
      : []),
  ];

  const [tab, setTab] = useState('attendance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeType, setEmployeeType] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        employeeType: employeeType || undefined,
      };
      let res;
      if (tab === 'attendance') res = await reportApi.attendance(params);
      else if (tab === 'supervisor-review') res = await reportApi.supervisorReview(params);
      else if (tab === 'payroll') res = await reportApi.payroll(params);
      else res = await reportApi.adjustments(params);

      setRows(res.rows || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, startDate, endDate, employeeType]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportCsv = async () => {
    try {
      const blob = await reportApi.exportCsv(tab, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        employeeType: employeeType || undefined,
      });
      downloadBlob(blob, `${tab}-report.csv`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Reports &amp; CSV Exports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Operational attendance, approval, and payroll reports</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 orange-gradient-btn text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              tab === t.key
                ? 'orange-gradient-btn text-white'
                : 'bg-white border border-orange-100 text-slate-700 hover:bg-orange-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <div className="premium-card rounded-2xl p-4 flex flex-wrap gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">From Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-xl" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">To Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-xl" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Staff Type</label>
            <select value={employeeType} onChange={(e) => setEmployeeType(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white">
              <option value="">All</option>
              <option value="DRIVER">Drivers</option>
              <option value="CLEANER">Cleaners</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileBarChart2} title="No report records found" />
      ) : (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  {Object.keys(rows[0]).map((col) => (
                    <th key={col} className="px-5 py-3.5 whitespace-nowrap">
                      {col.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-orange-50/30 transition-colors">
                    {Object.entries(row).map(([k, val]) => (
                      <td key={k} className="px-5 py-3 text-xs whitespace-nowrap">
                        {['status', 'approvalStatus', 'attendanceStatus', 'frequency', 'type', 'inclusionStatus'].includes(k) ? (
                          <StatusBadge status={val} />
                        ) : ['grossEarnings', 'totalDeductions', 'netPayable', 'amount'].includes(k) ? (
                          <span className="font-bold text-slate-900">{formatCurrency(val)}</span>
                        ) : (
                          String(val || '—')
                        )}
                      </td>
                    ))}
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
