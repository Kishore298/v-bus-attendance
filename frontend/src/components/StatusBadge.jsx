const STYLE_MAP = {
  PRESENT: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' },
  ABSENT: { badge: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' },
  HALF_DAY: { badge: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' },
  LEAVE: { badge: 'bg-sky-50 text-sky-700 border-sky-200/80', dot: 'bg-sky-500' },
  HOLIDAY: { badge: 'bg-orange-50 text-orange-700 border-orange-200/80', dot: 'bg-orange-500' },

  DRAFT: { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  SUBMITTED_TO_SUPERVISOR: { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  SUPERVISOR_PARTIAL_REVIEW: { badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  SUPERVISOR_APPROVED: { badge: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  FLAGGED_BY_SUPERVISOR: { badge: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-600' },
  RETURNED_TO_SUB_SUPERVISOR: { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  OWNER_PARTIAL_REVIEW: { badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  OWNER_APPROVED: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  RETURNED_BY_OWNER: { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  LOCKED_IN_PAYROLL: { badge: 'bg-slate-900 text-orange-300 border-slate-800', dot: 'bg-orange-400' },

  DRAFT_PREVIEW: { badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  FINALIZED: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },

  ACTIVE: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  INACTIVE: { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  DRIVER: { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  CLEANER: { badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  WEEKLY: { badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  MONTHLY: { badge: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  EARNING: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  DEDUCTION: { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  PENDING: { badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  CANCELLED: { badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },

  OWNER: { badge: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  SUPERVISOR: { badge: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-600' },
  SUB_SUPERVISOR: { badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
};

export function StatusBadge({ status, label }) {
  const cfg = STYLE_MAP[status] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };
  const text = label || String(status || '').replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cfg.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {text}
    </span>
  );
}
