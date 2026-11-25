import { ClipboardCheck, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { attendanceApi } from '../../api/endpoints';
import { EmptyState, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate, getErrorMessage } from '../../utils/format';

export function BatchListPage() {
  const { user } = useSelector((s) => s.auth);
  const [batches, setBatches] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.listBatches({ status: statusFilter || undefined });
      setBatches(res.batches || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Attendance Batches</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track daily submissions, Supervisor checks, and Owner payroll approval
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-sm border border-orange-200 rounded-xl bg-white font-medium"
          >
            <option value="">All Batch Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED_TO_SUPERVISOR">Submitted to Supervisor</option>
            <option value="SUPERVISOR_PARTIAL_REVIEW">Supervisor Partial Review</option>
            <option value="SUPERVISOR_APPROVED">Supervisor Approved</option>
            <option value="OWNER_PARTIAL_REVIEW">Owner Partial Review</option>
            <option value="OWNER_APPROVED">Owner Approved</option>
            <option value="RETURNED_TO_SUB_SUPERVISOR">Returned</option>
            <option value="LOCKED_IN_PAYROLL">Locked in Payroll</option>
          </select>
          {user.role === 'SUB_SUPERVISOR' && (
            <Link
              to="/attendance/mark"
              className="inline-flex items-center gap-1.5 px-4 py-2 orange-gradient-btn text-white text-sm font-bold rounded-xl"
            >
              <Plus className="w-4 h-4" /> New Batch
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : batches.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No attendance batches found"
          description="Submitted daily attendance batches will appear here."
        />
      ) : (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Batch Code</th>
                  <th className="px-5 py-3.5">Attendance Date</th>
                  <th className="px-5 py-3.5">Submitted By</th>
                  <th className="px-5 py-3.5">Breakdown</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-orange-700">
                      {b.batchCode}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{b.attendanceDateKey}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{b.submittedBy?.name || '—'}</span>
                      <span className="block text-slate-400">{formatDate(b.submittedAt)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {b.counts?.total || 0} staff ({b.counts?.drivers || 0}D / {b.counts?.cleaners || 0}C)
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        P:{b.counts?.present || 0} • A:{b.counts?.absent || 0} • H:{b.counts?.halfDay || 0} • L:{b.counts?.leave || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/attendance/batches/${b._id}`}
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
