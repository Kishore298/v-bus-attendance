import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Coins,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi } from '../../api/endpoints';
import { CardSkeleton, StatCard, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/format';

function HeroBanner({ badge, title, subtitle, action }) {
  return (
    <div className="premium-card rounded-2xl p-6 bg-gradient-to-r from-white via-orange-50/40 to-amber-50/50 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white border border-orange-100 p-1.5 shadow-xs items-center justify-center shrink-0">
            <img src="/logo.png" alt="V Bus Holidays" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100/90 text-orange-800 mb-1.5">
              {badge}
            </span>
            <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {action && <div className="flex flex-wrap items-center gap-2.5">{action}</div>}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        let res;
        if (user.role === 'OWNER') res = await dashboardApi.owner();
        else if (user.role === 'SUPERVISOR') res = await dashboardApi.supervisor();
        else res = await dashboardApi.subSupervisor();
        if (active) setData(res.dashboard);
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
  }, [user.role]);

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton count={4} />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (!data) return null;

  if (user.role === 'SUB_SUPERVISOR') {
    return (
      <div className="space-y-6">
        <HeroBanner
          badge="Sub-Supervisor Workspace"
          title="Daily Attendance Command"
          subtitle="Mark active drivers & cleaners, submit daily batches, and fix returned records."
          action={
            <Link
              to="/attendance/mark"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 orange-gradient-btn text-white text-sm font-bold rounded-xl"
            >
              + Mark Today&apos;s Attendance <ArrowUpRight className="w-4 h-4" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Drivers" value={data.activeDrivers} icon={Users} tone="orange" />
          <StatCard title="Active Cleaners" value={data.activeCleaners} icon={UserCheck} tone="blue" />
          <StatCard
            title="Submitted Batches"
            value={data.submittedBatchCount}
            subtitle={`${data.pendingSubmissionCount} draft pending`}
            icon={ClipboardList}
            tone="emerald"
          />
          <StatCard
            title="Returned / Flagged"
            value={data.rejectedOrFlaggedCount}
            subtitle="Requires your correction"
            icon={AlertTriangle}
            tone="rose"
          />
        </div>

        <div className="premium-card rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Today&apos;s Marked Summary ({data.todaySummary.dateKey})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {[
              { label: 'Present', val: data.todaySummary.present, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
              { label: 'Absent', val: data.todaySummary.absent, cls: 'bg-rose-50 border-rose-200 text-rose-800' },
              { label: 'Half Day', val: data.todaySummary.halfDay, cls: 'bg-amber-50 border-amber-200 text-amber-800' },
              { label: 'Leave', val: data.todaySummary.leave, cls: 'bg-sky-50 border-sky-200 text-sky-800' },
              { label: 'Holiday', val: data.todaySummary.holiday, cls: 'bg-orange-50 border-orange-200 text-orange-800' },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border p-4 ${item.cls}`}>
                <p className="text-xs font-bold uppercase tracking-wide">{item.label}</p>
                <p className="text-2xl font-extrabold mt-1">{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {data.rejectedRecords?.length > 0 && (
          <div className="premium-card rounded-2xl border-rose-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-50 to-orange-50/50 border-b border-rose-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-rose-900">Records Needing Correction</h2>
              <Link to="/attendance/batches" className="text-xs font-bold text-orange-700 hover:underline">
                Open All Batches
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.rejectedRecords.map((rec) => (
                <div key={rec._id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-orange-50/30">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {rec.employeeId?.employeeCode} — {rec.employeeId?.fullName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Date: {rec.attendanceDateKey} • Reason:{' '}
                      <span className="text-rose-700 font-semibold">
                        {rec.ownerReason || rec.supervisorReason || 'Needs review'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={rec.approvalStatus} />
                    <Link
                      to={`/attendance/batches/${rec.batchId}`}
                      className="px-3.5 py-2 text-xs font-bold orange-gradient-btn text-white rounded-xl"
                    >
                      Fix &amp; Resubmit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Recent Submissions</h2>
            <Link to="/attendance/batches" className="text-xs font-bold text-orange-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Batch</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Staff Count</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentBatches.map((b) => (
                  <tr key={b._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">{b.batchCode}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{b.attendanceDateKey}</td>
                    <td className="px-5 py-3.5 text-slate-600">{b.counts?.total || 0}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/attendance/batches/${b._id}`}
                        className="inline-flex px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg"
                      >
                        View Batch
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (user.role === 'SUPERVISOR') {
    const todayChart = [
      { name: 'Present', count: data.todaySummary.present, color: '#10b981' },
      { name: 'Absent', count: data.todaySummary.absent, color: '#ef4444' },
      { name: 'Half Day', count: data.todaySummary.halfDay, color: '#f97316' },
      { name: 'Leave', count: data.todaySummary.leave, color: '#0b4fa2' },
    ];

    return (
      <div className="space-y-6">
        <HeroBanner
          badge="Supervisor Verification"
          title="Batch Review & Verification Hub"
          subtitle="Verify submitted attendance batches, flag discrepancies, and forward approved records to Owner."
          action={
            <Link
              to="/attendance/batches"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 orange-gradient-btn text-white text-sm font-bold rounded-xl"
            >
              Review Pending ({data.pendingBatchesCount}) <ArrowUpRight className="w-4 h-4" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Employees" value={data.totalActiveEmployees} icon={Users} tone="orange" />
          <StatCard title="Pending Batches" value={data.pendingBatchesCount} icon={Clock} tone="amber" />
          <StatCard title="Approved Records" value={data.approvedAttendanceCount} icon={CheckCircle2} tone="emerald" />
          <StatCard
            title="Flagged / Returned"
            value={data.flaggedCount + data.rejectedCount}
            subtitle={`${data.flaggedCount} flagged • ${data.rejectedCount} returned`}
            icon={AlertTriangle}
            tone="rose"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="premium-card rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">
              Today&apos;s Attendance Distribution ({data.todaySummary.dateKey})
            </h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todayChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1ece4" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {todayChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-orange-100/80 bg-orange-50/40">
              <h2 className="text-sm font-bold text-slate-900">Batches Awaiting Your Review</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {data.pendingBatches.length === 0 ? (
                <p className="text-xs text-slate-500 p-8 text-center">All submitted batches have been reviewed.</p>
              ) : (
                data.pendingBatches.map((b) => (
                  <div key={b._id} className="p-4 flex items-center justify-between gap-3 hover:bg-orange-50/30">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{b.batchCode}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {b.attendanceDateKey} • {b.counts?.total || 0} staff • By {b.submittedBy?.name}
                      </p>
                    </div>
                    <Link
                      to={`/attendance/batches/${b._id}`}
                      className="px-3.5 py-1.5 text-xs font-bold orange-gradient-btn text-white rounded-xl"
                    >
                      Review
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OWNER DASHBOARD
  const workforceChart = [
    { name: 'Drivers', value: data.totalDrivers, color: '#f97316' },
    { name: 'Cleaners', value: data.totalCleaners, color: '#0b4fa2' },
  ];

  const payrollBarChart = [
    { name: 'Weekly Payroll', amount: data.weeklyPayrollSummary.totalNetPayable },
    { name: 'Monthly Payroll', amount: data.monthlyPayrollSummary.totalNetPayable },
    { name: 'Benefits', amount: data.adjustmentsSummary.benefitsTotal },
    { name: 'Deductions', amount: data.adjustmentsSummary.deductionsTotal },
  ];

  return (
    <div className="space-y-6">
      <HeroBanner
        badge="Owner Executive Suite"
        title="Fleet Attendance & Payroll Overview"
        subtitle="Approve verified depot attendance, manage staff salaries, and finalize weekly/monthly payroll."
        action={
          <>
            <Link
              to="/attendance/batches"
              className="px-4 py-2.5 bg-white border border-orange-200 hover:bg-orange-50 text-orange-800 text-xs font-bold rounded-xl transition-colors"
            >
              Pending Approvals ({data.pendingOwnerApprovals})
            </Link>
            <Link
              to="/payroll"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 orange-gradient-btn text-white text-xs font-bold rounded-xl"
            >
              Run Payroll <ArrowUpRight className="w-4 h-4" />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Workforce"
          value={data.totalActiveEmployees}
          subtitle={`${data.totalDrivers} Drivers • ${data.totalCleaners} Cleaners`}
          icon={Users}
          tone="orange"
        />
        <StatCard
          title="Pending Approvals"
          value={data.pendingOwnerApprovals}
          subtitle={`${data.pendingSupervisorApprovals} batch(es) at Supervisor`}
          icon={CalendarCheck}
          tone="amber"
        />
        <StatCard
          title="Total Salary Expenditure"
          value={formatCurrency(data.totalSalaryExpenditure)}
          subtitle={`Weekly: ${formatCurrency(data.weeklyPayrollSummary.totalNetPayable)} | Monthly: ${formatCurrency(data.monthlyPayrollSummary.totalNetPayable)}`}
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          title="Benefits & Deductions"
          value={formatCurrency(data.adjustmentsSummary.benefitsTotal)}
          subtitle={`Deductions: ${formatCurrency(data.adjustmentsSummary.deductionsTotal)}`}
          icon={Coins}
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="premium-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Payroll &amp; Adjustments Overview</h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" /> Financial Summary
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollBarChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1ece4" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Workforce Composition</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={workforceChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {workforceChart.map((w) => (
                    <Cell key={w.name} fill={w.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-5 text-xs font-semibold text-slate-700 mt-2">
            {workforceChart.map((w) => (
              <span key={w.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                {w.name}: {w.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-orange-100/80 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recent Payroll Runs</h2>
          <Link to="/payroll" className="text-xs font-bold text-orange-600 hover:underline">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Frequency</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Employees</th>
                <th className="px-5 py-3.5">Net Payable</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Finalized</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-500">
                    No payrolls generated yet.
                  </td>
                </tr>
              ) : (
                data.recentPayrolls.map((p) => (
                  <tr key={p._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold">
                      <Link to={`/payroll/${p._id}`} className="text-orange-600 hover:underline">
                        {p.payrollCode}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.frequency} /></td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{p.periodStartKey} → {p.periodEndKey}</td>
                    <td className="px-5 py-3.5 font-medium">{p.totals?.employeeCount || 0}</td>
                    <td className="px-5 py-3.5 font-extrabold text-slate-900">{formatCurrency(p.totals?.netPayable)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDate(p.finalizedAt)}</td>
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
