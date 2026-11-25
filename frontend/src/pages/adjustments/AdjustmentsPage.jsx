import { Coins, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adjustmentApi, employeeApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { EmptyState, StatCard, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, getErrorMessage, todayDateKey } from '../../utils/format';

export function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    employeeId: '',
    stage: 'PAYROLL_PROCESSING',
    category: 'BONUS',
    name: '',
    type: 'EARNING',
    amount: '',
    description: '',
    applicableDate: todayDateKey(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [adjRes, empRes] = await Promise.all([
        adjustmentApi.list(),
        employeeApi.list({ status: 'ACTIVE', limit: 200 }),
      ]);
      setAdjustments(adjRes.adjustments || []);
      setEmployees(empRes.employees || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adjustmentApi.create({ ...form, amount: Number(form.amount) });
      toast.success('Adjustment added');
      setOpen(false);
      setForm({
        employeeId: '',
        stage: 'PAYROLL_PROCESSING',
        category: 'BONUS',
        name: '',
        type: 'EARNING',
        amount: '',
        description: '',
        applicableDate: todayDateKey(),
      });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this pending adjustment?')) return;
    try {
      await adjustmentApi.cancel(id);
      toast.success('Adjustment cancelled');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const activeAdj = adjustments.filter((a) => a.inclusionStatus !== 'CANCELLED');
  const totalBenefits = activeAdj
    .filter((a) => a.type === 'EARNING')
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const totalDeductions = activeAdj
    .filter((a) => a.type === 'DEDUCTION')
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const pendingCount = activeAdj.filter((a) => a.inclusionStatus === 'PENDING').length;

  return (
    <div className="space-y-5">
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Benefits, Allowances &amp; Deductions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Petty cash, mileage, extra duty, bonuses, incentives, and advance salary deductions
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 orange-gradient-btn text-white text-sm font-bold rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Adjustment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Benefits & Allowances" value={formatCurrency(totalBenefits)} icon={Coins} tone="emerald" />
        <StatCard title="Total Deductions" value={formatCurrency(totalDeductions)} icon={Coins} tone="rose" />
        <StatCard title="Pending Payroll Inclusion" value={pendingCount} subtitle="Ready for next payroll run" icon={Coins} tone="orange" />
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : adjustments.length === 0 ? (
        <EmptyState icon={Coins} title="No adjustments recorded" description="Add employee benefits or deductions here or during attendance approval." />
      ) : (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Adjustment</th>
                  <th className="px-5 py-3.5">Stage</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Payroll Inclusion</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map((adj) => (
                  <tr key={adj._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-orange-700">{adj.adjustmentCode}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{adj.employeeId?.fullName}</p>
                      <p className="text-xs text-slate-500">{adj.employeeId?.employeeCode}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{adj.name}</p>
                      <p className="text-[11px] text-slate-500">{adj.category.replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{adj.stage.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{adj.applicableDateKey}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={adj.type} />
                        <span className="font-extrabold text-slate-900">{formatCurrency(adj.amount)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={adj.inclusionStatus} /></td>
                    <td className="px-5 py-3.5 text-right">
                      {adj.inclusionStatus === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(adj._id)}
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                          title="Cancel adjustment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Financial Adjustment">
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Employee</label>
            <select
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              required
            >
              <option value="">Select employee...</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.employeeCode} — {e.fullName} ({e.payrollFrequency})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                <option value="EARNING">Earning / Benefit</option>
                <option value="DEDUCTION">Deduction</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                <option value="PAYROLL_PROCESSING">Payroll Processing</option>
                <option value="ATTENDANCE_APPROVAL">Attendance Approval</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                <option value="BONUS">Bonus</option>
                <option value="INCENTIVE">Incentive</option>
                <option value="PETTY_CASH">Petty Cash</option>
                <option value="MILEAGE">Mileage Allowance</option>
                <option value="EXTRA_DUTY">Extra Duty</option>
                <option value="TRIP_ALLOWANCE">Trip Allowance</option>
                <option value="NIGHT_ALLOWANCE">Night Allowance</option>
                <option value="FOOD_ALLOWANCE">Food Allowance</option>
                <option value="ADVANCE_DEDUCTION">Advance Salary Deduction</option>
                <option value="OTHER_EARNING">Other Earning</option>
                <option value="OTHER_DEDUCTION">Other Deduction</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Applicable Date</label>
              <input
                type="date"
                value={form.applicableDate}
                onChange={(e) => setForm({ ...form, applicableDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Festival Bonus"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600 rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-bold orange-gradient-btn text-white rounded-xl">
              Save Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
