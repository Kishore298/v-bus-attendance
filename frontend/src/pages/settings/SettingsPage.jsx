import { Building2, Plus, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { miscApi, userApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { getErrorMessage } from '../../utils/format';

export function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [company, setCompany] = useState({
    companyName: '',
    companyAddress: '',
    companyLogoText: '',
    companyPhone: '',
  });
  const [loading, setLoading] = useState(true);
  const [userModal, setUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUB_SUPERVISOR',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([userApi.list(), miscApi.settings()]);
      setUsers(uRes.users || []);
      if (sRes.settings) {
        setCompany({
          companyName: sRes.settings.companyName || '',
          companyAddress: sRes.settings.companyAddress || '',
          companyLogoText: sRes.settings.companyLogoText || '',
          companyPhone: sRes.settings.companyPhone || '',
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    try {
      await miscApi.updateSettings(company);
      toast.success('Company details updated for payslips');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await userApi.create(newUser);
      toast.success('Account created');
      setUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'SUB_SUPERVISOR' });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleUserActive = async (u) => {
    try {
      await userApi.update(u._id, { isActive: !u.isActive });
      toast.success(`Account ${u.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-2xl p-5 bg-gradient-to-r from-white to-orange-50/40">
        <h1 className="text-xl font-extrabold text-slate-900">Users &amp; Company Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage Supervisor &amp; Sub-Supervisor logins and company details printed on PDF payslips
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info for Payslips */}
        <form onSubmit={handleSaveCompany} className="premium-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-orange-100 pb-3">
            <Building2 className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold text-slate-900">Company Payslip Header</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
            <input
              value={company.companyName}
              onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Depot / Company Address</label>
            <textarea
              rows={2}
              value={company.companyAddress}
              onChange={(e) => setCompany({ ...company, companyAddress: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Short Logo Badge</label>
              <input
                value={company.companyLogoText}
                maxLength={8}
                onChange={(e) => setCompany({ ...company, companyLogoText: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                value={company.companyPhone}
                onChange={(e) => setCompany({ ...company, companyPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 orange-gradient-btn text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Save Company Info
          </button>
        </form>

        {/* User Accounts */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100/80 flex items-center justify-between bg-orange-50/40">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-bold text-slate-900">Operational Accounts</h2>
            </div>
            <button
              type="button"
              onClick={() => setUserModal(true)}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold orange-gradient-btn text-white rounded-xl cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New User
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u._id} className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-orange-50/20">
                <div>
                  <p className="text-sm font-bold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={u.role} />
                  {u.role !== 'OWNER' && (
                    <button
                      type="button"
                      onClick={() => toggleUserActive(u)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={userModal} onClose={() => setUserModal(false)} title="Create Supervisor / Sub-Supervisor">
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                <option value="SUB_SUPERVISOR">Sub-Supervisor</option>
                <option value="SUPERVISOR">Supervisor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
              <input
                type="password"
                minLength={6}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setUserModal(false)} className="px-4 py-2 text-sm text-slate-600 rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-bold orange-gradient-btn text-white rounded-xl">
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
