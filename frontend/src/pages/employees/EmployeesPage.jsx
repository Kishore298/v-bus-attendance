import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, Edit3, Plus, Search, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { employeeApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { EmptyState, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate, getErrorMessage, todayDateKey } from '../../utils/format';

const createSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  employeeType: z.enum(['DRIVER', 'CLEANER']),
  mobile: z.string().min(7, 'Valid mobile number required'),
  joiningDate: z.string().min(8),
  payrollFrequency: z.enum(['WEEKLY', 'MONTHLY']),
  salaryType: z.enum(['FIXED_MONTHLY', 'FIXED_WEEKLY', 'DAILY_WAGE']),
  salaryAmount: z.coerce.number().positive('Salary must be > 0'),
  notes: z.string().optional(),
});

const salarySchema = z.object({
  salaryType: z.enum(['FIXED_MONTHLY', 'FIXED_WEEKLY', 'DAILY_WAGE']),
  amount: z.coerce.number().positive('Salary must be > 0'),
  effectiveFrom: z.string().min(8),
  notes: z.string().optional(),
});

export function EmployeesPage() {
  const { user } = useSelector((s) => s.auth);
  const isOwner = user.role === 'OWNER';
  const isSubSupervisor = user.role === 'SUB_SUPERVISOR';

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [salaryTarget, setSalaryTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeApi.list({
        search: search || undefined,
        employeeType: typeFilter || undefined,
        status: !isSubSupervisor && statusFilter ? statusFilter : undefined,
      });
      setEmployees(res.employees || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, isSubSupervisor]);

  useEffect(() => {
    load();
  }, [load]);

  const createForm = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: {
      employeeType: 'DRIVER',
      payrollFrequency: 'MONTHLY',
      salaryType: 'FIXED_MONTHLY',
      joiningDate: todayDateKey(),
    },
  });

  const salaryForm = useForm({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      salaryType: 'FIXED_MONTHLY',
      effectiveFrom: todayDateKey(),
    },
  });

  const handleCreate = async (values) => {
    try {
      await employeeApi.create(values);
      toast.success('Employee added');
      setCreateOpen(false);
      createForm.reset({
        employeeType: 'DRIVER',
        payrollFrequency: 'MONTHLY',
        salaryType: 'FIXED_MONTHLY',
        joiningDate: todayDateKey(),
      });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      await employeeApi.update(editTarget._id, {
        fullName: editTarget.fullName,
        employeeType: editTarget.employeeType,
        mobile: editTarget.mobile,
        status: editTarget.status,
        payrollFrequency: editTarget.payrollFrequency,
        notes: editTarget.notes,
      });
      toast.success('Employee updated');
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUpdateSalary = async (values) => {
    try {
      await employeeApi.updateSalary(salaryTarget._id, values);
      toast.success(`Salary updated for ${salaryTarget.fullName}`);
      setSalaryTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSoftDelete = async (emp) => {
    if (!window.confirm(`Deactivate and soft-delete ${emp.fullName} (${emp.employeeCode})? Historical attendance & payroll records will remain intact.`)) {
      return;
    }
    try {
      await employeeApi.remove(emp._id, { reason: 'Soft deleted from employee directory' });
      toast.success('Employee soft-deleted');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isSubSupervisor ? 'Active Staff Directory' : 'Employees & Salary Configuration'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOwner
              ? 'Manage drivers and cleaners, weekly/monthly payroll frequency, and individual salary'
              : 'View active drivers and cleaners'}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 orange-gradient-btn text-white text-sm font-bold rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="premium-card rounded-2xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white font-medium"
        >
          <option value="">All Types</option>
          <option value="DRIVER">Drivers</option>
          <option value="CLEANER">Cleaners</option>
        </select>
        {!isSubSupervisor && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white font-medium"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : employees.length === 0 ? (
        <EmptyState icon={Users} title="No employees found" description="Adjust filters or add a new driver/cleaner." />
      ) : (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Type</th>
                  {!isSubSupervisor && <th className="px-5 py-3.5">Mobile</th>}
                  {!isSubSupervisor && <th className="px-5 py-3.5">Frequency</th>}
                  {!isSubSupervisor && <th className="px-5 py-3.5">Salary</th>}
                  <th className="px-5 py-3.5">Status</th>
                  {isOwner && <th className="px-5 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold">
                      <Link to={`/employees/${emp._id}`} className="text-orange-600 hover:underline">
                        {emp.employeeCode}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {emp.fullName?.[0] || 'E'}
                        </span>
                        <span className="font-semibold text-slate-900">{emp.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={emp.employeeType} /></td>
                    {!isSubSupervisor && <td className="px-5 py-3.5 text-slate-600">{emp.mobile}</td>}
                    {!isSubSupervisor && (
                      <td className="px-5 py-3.5"><StatusBadge status={emp.payrollFrequency} /></td>
                    )}
                    {!isSubSupervisor && (
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(emp.currentSalary?.amount || 0)}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {emp.currentSalary?.salaryType?.replace(/_/g, ' ') || 'Not set'}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3.5"><StatusBadge status={emp.status} /></td>
                    {isOwner && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSalaryTarget(emp);
                              salaryForm.reset({
                                salaryType: emp.currentSalary?.salaryType || 'FIXED_MONTHLY',
                                amount: emp.currentSalary?.amount || '',
                                effectiveFrom: todayDateKey(),
                                notes: '',
                              });
                            }}
                            title="Edit Salary"
                            className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditTarget({ ...emp })}
                            title="Edit Employee"
                            className="p-2 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSoftDelete(emp)}
                            title="Soft Delete"
                            className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Employee Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add New Employee">
        <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input {...createForm.register('fullName')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
            {createForm.formState.errors.fullName && (
              <p className="text-xs text-rose-600 mt-0.5">{createForm.formState.errors.fullName.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Employee Type</label>
              <select {...createForm.register('employeeType')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white">
                <option value="DRIVER">Driver</option>
                <option value="CLEANER">Cleaner</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile</label>
              <input {...createForm.register('mobile')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Joining Date</label>
              <input type="date" {...createForm.register('joiningDate')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payroll Frequency</label>
              <select {...createForm.register('payrollFrequency')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white">
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Salary Type</label>
              <select {...createForm.register('salaryType')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white">
                <option value="FIXED_MONTHLY">Fixed Monthly</option>
                <option value="FIXED_WEEKLY">Fixed Weekly</option>
                <option value="DAILY_WAGE">Daily Wage</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Salary Amount (₹)</label>
              <input type="number" step="0.01" {...createForm.register('salaryAmount')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes (optional)</label>
            <input {...createForm.register('notes')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-bold orange-gradient-btn text-white rounded-xl">
              Create Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={`Edit ${editTarget?.fullName || ''}`}
        subtitle={`Joining Date: ${formatDate(editTarget?.joiningDate)}`}
      >
        {editTarget && (
          <form onSubmit={handleUpdateEmployee} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                value={editTarget.fullName}
                onChange={(e) => setEditTarget({ ...editTarget, fullName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={editTarget.employeeType}
                  onChange={(e) => setEditTarget({ ...editTarget, employeeType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  <option value="DRIVER">Driver</option>
                  <option value="CLEANER">Cleaner</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile</label>
                <input
                  value={editTarget.mobile}
                  onChange={(e) => setEditTarget({ ...editTarget, mobile: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payroll Frequency</label>
                <select
                  value={editTarget.payrollFrequency}
                  onChange={(e) => setEditTarget({ ...editTarget, payrollFrequency: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editTarget.status}
                  onChange={(e) => setEditTarget({ ...editTarget, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-bold orange-gradient-btn text-white rounded-xl">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Employee Salary Modal */}
      <Modal
        open={Boolean(salaryTarget)}
        onClose={() => setSalaryTarget(null)}
        title={`Update Salary — ${salaryTarget?.fullName || ''}`}
        subtitle="Historical salary structures and finalized payrolls remain preserved"
      >
        <form onSubmit={salaryForm.handleSubmit(handleUpdateSalary)} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Salary Type</label>
            <select {...salaryForm.register('salaryType')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white">
              <option value="FIXED_MONTHLY">Fixed Monthly</option>
              <option value="FIXED_WEEKLY">Fixed Weekly</option>
              <option value="DAILY_WAGE">Daily Wage</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Salary Amount (₹)</label>
              <input type="number" step="0.01" {...salaryForm.register('amount')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Effective Date</label>
              <input type="date" {...salaryForm.register('effectiveFrom')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
            <input {...salaryForm.register('notes')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSalaryTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-bold orange-gradient-btn text-white rounded-xl">
              Save Salary
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
