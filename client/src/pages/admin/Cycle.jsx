import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import { Settings, Lock, Unlock, Calendar } from 'lucide-react';
import { formatDate, cn } from '../../lib/utils';

const LABELS = {
  goal_setting: { label: 'Phase 1 — Goal Setting', month: 'May', detail: 'Create, submit & approve goals' },
  Q1: { label: 'Q1 Check-in', month: 'July', detail: 'Progress update — Planned vs Actual' },
  Q2: { label: 'Q2 Check-in', month: 'October', detail: 'Progress update — Planned vs Actual' },
  Q3: { label: 'Q3 Check-in', month: 'January', detail: 'Progress update — Planned vs Actual' },
  Q4: { label: 'Q4 / Annual', month: 'March / April', detail: 'Final achievement capture' }
};
const ORDER = ['goal_setting', 'Q1', 'Q2', 'Q3', 'Q4'];

export default function AdminCycle() {
  const toast = useToast();
  const [cycle, setCycle] = useState(null);

  const load = async () => {
    const r = await api.get('/admin/cycle');
    if (r.success) setCycle(r.data.cycle);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (key, current) => {
    const r = await api.put(`/admin/cycle/${key}`, { isOpen: !current });
    if (!r.success) return toast.error(r.error);
    toast.success(`${LABELS[key]?.label || key} ${!current ? 'opened' : 'closed'}`);
    load();
  };

  if (!cycle) return <Spinner label="Loading cycle config…" />;

  const map = {};
  for (const c of cycle) map[c.key] = c;

  return (
    <div>
      <PageHeader
        title="Cycle Windows"
        subtitle="Open or close phases of the FY26 goal cycle. Closed windows block achievement entry."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        {ORDER.map(k => {
          const c = map[k];
          const isOpen = c && c.isOpen;
          const meta = LABELS[k];
          return (
            <div key={k} className="card">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                    isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  )}>
                    {isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{meta.label}</h3>
                      <span className={cn('badge', isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}>
                        {isOpen ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Calendar window: {meta.month}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{meta.detail}</p>
                    {c && <div className="text-xs text-slate-400 mt-2">Last updated {formatDate(c.updatedAt)}</div>}
                  </div>
                  <button onClick={() => toggle(k, isOpen)} className={cn(
                    'btn',
                    isOpen ? 'btn-secondary' : 'btn-primary'
                  )}>
                    {isOpen ? 'Close' : 'Open'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-xs text-slate-500 max-w-2xl">
        <Settings className="w-3.5 h-3.5 inline mr-1" />
        In production, these windows open automatically per the calendar above. Admin can override here for exception handling.
      </div>
    </div>
  );
}
