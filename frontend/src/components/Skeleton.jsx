export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="premium-card rounded-2xl p-5 animate-pulse">
          <div className="h-3 w-24 bg-orange-100 rounded mb-3" />
          <div className="h-7 w-24 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-32 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="premium-card rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="h-4 w-48 bg-orange-100 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 w-full bg-slate-100/80 rounded-xl" />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="premium-card rounded-2xl border-dashed border-orange-200 p-12 text-center bg-gradient-to-b from-white to-orange-50/30">
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mb-3 shadow-xs">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      {description && <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, tone = 'orange' }) {
  const tones = {
    orange: {
      icon: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/25',
      bar: 'from-orange-500 to-amber-400',
    },
    blue: {
      icon: 'bg-sky-50 text-sky-700 border border-sky-200',
      bar: 'from-sky-600 to-blue-400',
    },
    emerald: {
      icon: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      bar: 'from-emerald-500 to-teal-400',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-700 border border-amber-200',
      bar: 'from-amber-500 to-orange-400',
    },
    rose: {
      icon: 'bg-rose-50 text-rose-700 border border-rose-200',
      bar: 'from-rose-500 to-orange-400',
    },
    indigo: {
      icon: 'bg-orange-50 text-orange-700 border border-orange-200',
      bar: 'from-orange-600 to-amber-500',
    },
    slate: {
      icon: 'bg-slate-100 text-slate-700 border border-slate-200',
      bar: 'from-slate-700 to-slate-500',
    },
  };

  const t = tones[tone] || tones.orange;

  return (
    <div className="premium-card rounded-2xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`h-1 w-full bg-gradient-to-r ${t.bar}`} />
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
