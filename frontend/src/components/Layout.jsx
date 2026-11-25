import {
  Bell,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  Coins,
  FileBarChart2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { miscApi } from '../api/endpoints';
import { logout } from '../store/authSlice';
import { fetchNotifications } from '../store/notificationSlice';
import { StatusBadge } from './StatusBadge';

const NAV_BY_ROLE = {
  OWNER: [
    { to: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
    { to: '/employees', label: 'Employees & Salaries', icon: Users },
    { to: '/attendance/batches', label: 'Attendance Review', icon: ClipboardCheck },
    { to: '/adjustments', label: 'Benefits & Deductions', icon: Coins },
    { to: '/payroll', label: 'Payroll & Payslips', icon: Wallet },
    { to: '/reports', label: 'Reports & Exports', icon: FileBarChart2 },
    { to: '/audit-logs', label: 'Audit Trail', icon: History },
    { to: '/settings', label: 'Users & Company', icon: Settings },
  ],
  SUPERVISOR: [
    { to: '/', label: 'Supervisor Hub', icon: LayoutDashboard },
    { to: '/employees', label: 'Drivers & Cleaners', icon: Users },
    { to: '/attendance/batches', label: 'Batch Review', icon: ClipboardCheck },
    { to: '/reports', label: 'Attendance Reports', icon: FileBarChart2 },
  ],
  SUB_SUPERVISOR: [
    { to: '/', label: 'Operations Home', icon: LayoutDashboard },
    { to: '/attendance/mark', label: 'Mark Attendance', icon: ClipboardList },
    { to: '/attendance/batches', label: 'My Submissions', icon: ClipboardCheck },
    { to: '/reports', label: 'My History Reports', icon: FileBarChart2 },
  ],
};

export function Layout() {
  const { user } = useSelector((s) => s.auth);
  const { items: notifications, unreadCount } = useSelector((s) => s.notifications);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchNotifications());
    const id = setInterval(() => dispatch(fetchNotifications()), 30000);
    return () => clearInterval(id);
  }, [dispatch]);

  const navItems = NAV_BY_ROLE[user?.role] || [];

  const handleMarkRead = async (id) => {
    await miscApi.markRead(id);
    dispatch(fetchNotifications());
  };

  const handleMarkAllRead = async () => {
    await miscApi.markAllRead();
    dispatch(fetchNotifications());
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-800 border-r border-orange-100/90">
      <div className="px-5 py-4 border-b border-orange-100/80 bg-gradient-to-b from-orange-50/60 to-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-orange-100 shadow-xs p-1 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="V Bus Holidays" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-tight text-slate-900">
              V <span className="text-orange-600">BUS</span> HOLIDAYS
            </p>
            <p className="text-[11px] font-medium text-slate-500">Attendance &amp; Payroll</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600/80 px-2">
          Fleet Workspace
        </p>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'orange-gradient-btn text-white'
                    : 'text-slate-600 hover:bg-orange-50/80 hover:text-orange-700'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/60 border border-orange-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="mb-3">
          <StatusBadge status={user?.role} />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-orange-600 hover:text-white text-slate-700 border border-orange-200/80 transition-colors cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#FAF8F5]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-68 shrink-0 sticky top-0 h-screen no-print">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 h-full shadow-2xl">{SidebarContent}</div>
          <div
            className="flex-1 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-orange-100/80 px-4 lg:px-8 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-orange-50 hover:text-orange-600"
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/logo.png" alt="V Bus" className="w-8 h-8 object-contain" />
              <span className="text-sm font-extrabold text-slate-900">
                V <span className="text-orange-600">BUS</span>
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="font-medium">Connecting to City • Fleet Operations Live</span>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50/70 border border-orange-100 text-xs font-semibold text-slate-700">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px] font-bold">
                {user?.name?.[0] || 'V'}
              </span>
              <span className="max-w-36 truncate">{user?.name}</span>
            </div>

            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2.5 rounded-xl bg-white border border-orange-100 text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-13 w-80 sm:w-96 bg-white rounded-2xl border border-orange-100 shadow-2xl z-40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-orange-100 bg-orange-50/50">
                  <span className="text-xs font-bold text-slate-900">
                    Notifications ({unreadCount} unread)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 p-5 text-center">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => !n.isRead && handleMarkRead(n._id)}
                        className={`p-3.5 text-left cursor-pointer hover:bg-orange-50/40 transition-colors ${
                          n.isRead ? 'opacity-65' : 'bg-orange-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900">{n.title}</p>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
