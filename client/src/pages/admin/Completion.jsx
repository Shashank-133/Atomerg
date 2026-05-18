import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import { CheckCircle2, Circle } from 'lucide-react';
import { initials, cn } from '../../lib/utils';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function AdminCompletion() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/completion').then(r => { if (r.success) setData(r.data); });
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const total = data.grid.length * QUARTERS.length;
    const done = data.grid.reduce((s, e) => s + QUARTERS.filter(q => e.quarters[q]).length, 0);
    const rate = total ? Math.round((done / total) * 100) : 0;
    return { total, done, rate };
  }, [data]);

  if (!data) return <Spinner label="Loading completion grid…" />;

  return (
    <div>
      <PageHeader
        title="Check-in Completion"
        subtitle={`Heat-map view across employees and quarters. Overall: ${stats.done}/${stats.total} (${stats.rate}%)`}
      />

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Manager</th>
                {QUARTERS.map(q => <th key={q} className="text-center">{q}</th>)}
                <th className="text-center">Completion</th>
              </tr>
            </thead>
            <tbody>
              {data.grid.map(r => {
                const done = QUARTERS.filter(q => r.quarters[q]).length;
                const rate = Math.round((done / 4) * 100);
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-center">
                          {initials(r.name)}
                        </div>
                        <span className="font-medium text-slate-800">{r.name}</span>
                      </div>
                    </td>
                    <td className="text-slate-600">{r.managerName || <span className="text-slate-400">—</span>}</td>
                    {QUARTERS.map(q => (
                      <td key={q} className="text-center">
                        <div className={cn(
                          'inline-flex w-8 h-8 rounded-md items-center justify-center',
                          r.quarters[q]
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-100 text-slate-400'
                        )} title={r.quarters[q] ? 'Done' : 'Pending'}>
                          {r.quarters[q]
                            ? <CheckCircle2 className="w-4 h-4" />
                            : <Circle className="w-4 h-4" />}
                        </div>
                      </td>
                    ))}
                    <td className="text-center">
                      <span className={cn(
                        'tabular-nums font-semibold',
                        rate === 100 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-slate-600'
                      )}>{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
