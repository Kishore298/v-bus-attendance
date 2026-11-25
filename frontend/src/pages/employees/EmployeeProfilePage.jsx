import { ArrowLeft, Calendar, Phone, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { employeeApi } from '../../api/endpoints';
import { TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/format';

export function EmployeeProfilePage() {
  const { id } = useParams();
  const { user } = useSelector((s) => s.auth);
  const isSubSupervisor = user.role === 'SUB_SUPERVISOR';

  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [empRes, attRes] = await Promise.all([
          employeeApi.get(id),
          employeeApi.attendanceHistory(id),
        ]);
        if (active) {
          setEmployee(empRes.employee);
          setAttendance(attRes.records || []);
        }
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <TableSkeleton rows={6} />;
  if (!employee) return null;

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-2xl p-5 flex items-center gap-4 bg-gradient-to-r from-white to-orange-50/40">
        <Link to="/employees" className="p-2.5 rounded-xl bg-white border border-orange-100 hover:bg-orange-50 text-slate-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-extrabold text-lg flex items-center justify-center shadow-sm">
          {employee.fullName?.[0] || 'E'}
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            {employee.fullName} <span className="text-orange-600 font-mono text-base">({employee.employeeCode})</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <StatusBadge status={employee.employeeType} />
            <StatusBadge status={employee.status} />
            {!isSubSupervisor && <StatusBadge status={employee.payrollFrequency} />}
          </div>
        </div>
      </div>

      {!isSubSupervisor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="premium-card rounded-2xl p-6 space-y-3 text-sm">
            <h2 className="font-bold text-slate-900 border-b border-orange-100 pb-2.5">Profile Information</h2>
            <p className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-orange-500" />
              <span className="text-slate-500">Mobile:</span> <strong>{employee.mobile}</strong>
            </p>
            <p className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span className="text-slate-500">Joining Date:</span> <strong>{formatDate(employee.joiningDate)}</strong>
            </p>
            <p className="flex items-center gap-2 text-slate-700">
              <Wallet className="w-4 h-4 text-orange-500" />
              <span className="text-slate-500">Current Salary:</span>
              <strong className="text-emerald-700">{formatCurrency(employee.currentSalary?.amount || 0)}</strong>
              <span className="text-xs text-slate-500">({employee.currentSalary?.salaryType?.replace(/_/g, ' ')})</span>
            </p>
            {employee.notes && (
              <p className="text-xs text-slate-600 bg-orange-50/60 p-3 rounded-xl border border-orange-100">
                <strong>Notes:</strong> {employee.notes}
              </p>
            )}
          </div>

          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-orange-100/80 bg-orange-50/40">
              <h2 className="text-sm font-bold text-slate-900">Salary History</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {(employee.salaryHistory || []).map((s) => (
                <div key={s._id} className="px-6 py-3.5 flex items-center justify-between text-sm hover:bg-orange-50/20">
                  <div>
                    <p className="font-bold text-slate-900">{formatCurrency(s.amount)}</p>
                    <p className="text-xs text-slate-500">
                      {s.salaryType.replace(/_/g, ' ')} • Effective {formatDate(s.effectiveFrom)}
                    </p>
                  </div>
                  <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-orange-100/80">
          <h2 className="text-sm font-bold text-slate-900">Attendance History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Approval</th>
                <th className="px-5 py-3.5">Notes / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-500">
                    No attendance records yet.
                  </td>
                </tr>
              ) : (
                attendance.map((rec) => (
                  <tr key={rec._id} className="hover:bg-orange-50/30">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{rec.attendanceDateKey}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={rec.status} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={rec.approvalStatus} /></td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {rec.ownerReason || rec.supervisorReason || rec.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
