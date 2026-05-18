import { cn } from '../../lib/utils';

export default function KpiCard({ label, value, hint, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand:   'bg-brand-50 text-brand-700 ring-brand-100',
    green:   'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber:   'bg-amber-50 text-amber-700 ring-amber-100',
    purple:  'bg-purple-50 text-purple-700 ring-purple-100',
    slate:   'bg-slate-50 text-slate-700 ring-slate-100'
  }[tone];
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
          {Icon && (
            <div className={cn('w-9 h-9 rounded-lg ring-1 flex items-center justify-center', tones)}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-800 tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      </div>
    </div>
  );
}
