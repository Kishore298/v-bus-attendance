import { History } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { miscApi } from '../../api/endpoints';
import { EmptyState, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { getErrorMessage } from '../../utils/format';

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await miscApi.auditLogs({ entityType: entityType || undefined });
      setLogs(res.logs || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable history of attendance actions, approvals, reopenings, salary edits, and payroll runs
          </p>
        </div>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="px-3.5 py-2 text-sm border border-orange-200 rounded-xl bg-white font-semibold"
        >
          <option value="">All Entities</option>
          <option value="AttendanceBatch">Attendance Batch</option>
          <option value="Attendance">Attendance Record</option>
          <option value="Employee">Employee</option>
          <option value="SalaryStructure">Salary Structure</option>
          <option value="SalaryAdjustment">Salary Adjustment</option>
          <option value="Payroll">Payroll</option>
          <option value="User">User</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : logs.length === 0 ? (
        <EmptyState icon={History} title="No audit logs found" />
      ) : (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Details / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 mb-1">{log.actorName}</p>
                      <StatusBadge status={log.actorRole} />
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-orange-700">{log.action}</td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{log.entityType}</td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-md">
                      {log.reason && <p className="text-rose-700 font-semibold">Reason: {log.reason}</p>}
                      {log.newData && (
                        <code className="text-[11px] text-slate-600 break-all bg-orange-50/50 px-2 py-1 rounded-md block mt-1">
                          {JSON.stringify(log.newData)}
                        </code>
                      )}
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
