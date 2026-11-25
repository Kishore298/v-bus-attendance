import { CheckCheck, ClipboardList, Search, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { attendanceApi, employeeApi } from '../../api/endpoints';
import { EmptyState, TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { getErrorMessage, todayDateKey } from '../../utils/format';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
  { value: 'ABSENT', label: 'Absent', activeCls: 'bg-rose-600 text-white border-rose-600 shadow-xs' },
  { value: 'HALF_DAY', label: 'Half Day', activeCls: 'bg-amber-500 text-white border-amber-500 shadow-xs' },
  { value: 'LEAVE', label: 'Leave', activeCls: 'bg-sky-600 text-white border-sky-600 shadow-xs' },
  { value: 'HOLIDAY', label: 'Holiday', activeCls: 'bg-orange-600 text-white border-orange-600 shadow-xs' },
];

export function MarkAttendancePage() {
  const navigate = useNavigate();
  const [dateKey, setDateKey] = useState(todayDateKey());
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await employeeApi.list({ limit: 200 });
        const list = res.employees || [];
        setEmployees(list);
        const init = {};
        for (const emp of list) {
          init[emp._id] = { status: 'PRESENT', leavePaidType: 'NONE', notes: '' };
        }
        setEntries(init);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (typeFilter && e.employeeType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!e.fullName.toLowerCase().includes(q) && !e.employeeCode.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [employees, typeFilter, search]);

  const summary = useMemo(() => {
    const counts = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0 };
    for (const emp of employees) {
      const st = entries[emp._id]?.status || 'PRESENT';
      counts[st] = (counts[st] || 0) + 1;
    }
    return counts;
  }, [employees, entries]);

  const updateEntry = (empId, patch) => {
    setEntries((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], ...patch },
    }));
  };

  const handleMarkAllPresent = () => {
    setEntries((prev) => {
      const next = { ...prev };
      for (const emp of filteredEmployees) {
        next[emp._id] = { ...next[emp._id], status: 'PRESENT', leavePaidType: 'NONE' };
      }
      return next;
    });
    toast.success(`Marked ${filteredEmployees.length} staff as Present`);
  };

  const handleSubmit = async (submitNow) => {
    if (!employees.length) return;
    setSubmitting(true);
    try {
      const payload = {
        attendanceDate: dateKey,
        submitNow,
        entries: employees.map((emp) => {
          const item = entries[emp._id] || { status: 'PRESENT', leavePaidType: 'NONE', notes: '' };
          return {
            employeeId: emp._id,
            status: item.status,
            leavePaidType: item.status === 'LEAVE' ? item.leavePaidType || 'UNPAID' : 'NONE',
            notes: item.notes || '',
          };
        }),
      };
      const res = await attendanceApi.createBatch(payload);
      toast.success(
        submitNow
          ? `Batch ${res.batch.batchCode} submitted to Supervisor!`
          : `Draft ${res.batch.batchCode} saved`
      );
      navigate(`/attendance/batches/${res.batch._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Mark Daily Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">Mobile-first depot attendance entry for active drivers &amp; cleaners</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            className="px-3.5 py-2 text-sm font-semibold border border-orange-200 rounded-xl bg-white"
          />
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
          >
            <CheckCheck className="w-4 h-4" /> Mark All Present
          </button>
        </div>
      </div>

      {/* Filters & Live Summary */}
      <div className="premium-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver or cleaner..."
              className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
            />
          </div>
          <div className="flex rounded-xl border border-orange-200 overflow-hidden text-xs font-bold">
            {[
              { val: '', label: 'All Staff' },
              { val: 'DRIVER', label: 'Drivers' },
              { val: 'CLEANER', label: 'Cleaners' },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setTypeFilter(t.val)}
                className={`px-3.5 py-2 cursor-pointer transition-colors ${
                  typeFilter === t.val
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-slate-700 hover:bg-orange-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
            Present: {summary.PRESENT}
          </span>
          <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
            Absent: {summary.ABSENT}
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
            Half Day: {summary.HALF_DAY}
          </span>
          <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 font-semibold">
            Leave: {summary.LEAVE}
          </span>
          <span className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 font-semibold">
            Holiday: {summary.HOLIDAY}
          </span>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No matching active employees" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredEmployees.map((emp) => {
            const val = entries[emp._id] || { status: 'PRESENT', leavePaidType: 'NONE', notes: '' };
            return (
              <div
                key={emp._id}
                className="premium-card rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
                      {emp.fullName?.[0] || 'S'}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{emp.fullName}</p>
                      <p className="text-xs font-mono text-slate-500">{emp.employeeCode}</p>
                    </div>
                  </div>
                  <StatusBadge status={emp.employeeType} />
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = val.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          updateEntry(emp._id, {
                            status: opt.value,
                            leavePaidType: opt.value === 'LEAVE' ? 'UNPAID' : 'NONE',
                          })
                        }
                        className={`py-2.5 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          active
                            ? opt.activeCls
                            : 'bg-slate-50/70 text-slate-700 border-slate-200 hover:bg-orange-50/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {val.status === 'LEAVE' && (
                  <div className="flex items-center gap-2 text-xs bg-sky-50/60 p-2 rounded-xl border border-sky-100">
                    <span className="text-slate-700 font-semibold">Leave Type:</span>
                    {['UNPAID', 'PAID'].map((lt) => (
                      <button
                        key={lt}
                        type="button"
                        onClick={() => updateEntry(emp._id, { leavePaidType: lt })}
                        className={`px-3 py-1 rounded-lg border font-bold cursor-pointer ${
                          val.leavePaidType === lt
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {lt}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={val.notes || ''}
                  onChange={(e) => updateEntry(emp._id, { notes: e.target.value })}
                  placeholder="Optional note (e.g., route number, shift)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-68 bg-white/95 backdrop-blur-md border-t border-orange-100 px-5 py-3.5 flex items-center justify-between gap-3 z-20 shadow-lg">
        <span className="text-xs text-slate-700 font-medium">
          Date: <strong className="text-orange-700">{dateKey}</strong> • {employees.length} Staff
        </span>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={submitting || !employees.length}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 text-xs font-bold border border-orange-200 text-slate-700 bg-white hover:bg-orange-50 rounded-xl cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={submitting || !employees.length}
            onClick={() => handleSubmit(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold orange-gradient-btn text-white rounded-xl cursor-pointer disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Submitting...' : 'Submit Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}
