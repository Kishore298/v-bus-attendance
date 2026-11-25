import { X } from 'lucide-react';
import { useEffect } from 'react';

export function Modal({ open, onClose, title, subtitle, maxWidth = 'max-w-lg', children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs">
      <div
        className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-orange-100 max-h-[90vh] flex flex-col overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
        <div className="flex items-start justify-between px-6 py-4 border-b border-orange-100/70 bg-gradient-to-r from-orange-50/50 to-white">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
