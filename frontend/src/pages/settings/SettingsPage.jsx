import { Plus, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { userApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { getErrorMessage } from '../../utils/format';

export function SettingsPage() {
  const [users, setUsers] = useState([]);
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
      const uRes = await userApi.list();
      setUsers(uRes.users || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">User Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and manage Supervisor and Sub-Supervisor login access
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUserModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold orange-gradient-btn text-white rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-orange-100/80 flex items-center gap-2 bg-orange-50/40">
          <UserPlus className="w-4 h-4 text-orange-600" />
          <h2 className="text-sm font-bold text-slate-900">Operational Accounts</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u._id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-orange-50/20">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {u.name?.[0] || 'U'}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <StatusBadge status={u.role} />
                {u.role !== 'OWNER' && (
                  <button
                    type="button"
                    onClick={() => toggleUserActive(u)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer ${
                      u.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
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
