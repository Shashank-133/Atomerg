import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { CheckCircle2, Circle, ClipboardCheck, ArrowRight } from 'lucide-react';
import { cn, initials, formatDate } from '../../lib/utils';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ManagerCheckIns() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/manager/checkins').then(r => { if (r.success) setData(r.data); });
  }, []);

  if (!data) return <Spinner label="Loading check-ins…" />;

  const byEmployee = {};
  for (const t of data.tracker) {
    if (!byEmployee[t.employeeId]) byEmployee[t.employeeId] = { name: t.employeeName, quarters: {} };
    byEmployee[t.employeeId].quarters[t.quarter] = t.completed;
  }

  const pendingCount = data.tracker.filter(t => !t.completed).length;

  return (
    <div>
      <PageHeader
        title="Quarterly Check-ins"
        subtitle={`${data.reports.length} direct reports · ${pendingCount} pending check-in${pendingCount === 1 ? '' : 's'}`}
      />

      {Object.keys(byEmployee).length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No direct reports" message="You have no team members to check in with." />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  {QUARTERS.map(q => <th key={q} className="text-center">{q}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byEmployee).map(([eid, row]) => (
                  <tr key={eid}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center">
                          {initials(row.name)}
                        </div>
                        <div className="font-medium text-slate-800">{row.name}</div>
                      </div>
                    </td>
                    {QUARTERS.map(q => (
                      <td key={q} className="text-center">
                        <Link
                          to={`/manager/checkins/${eid}/${q}`}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                            row.quarters[q]
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          {row.quarters[q] ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                          {row.quarters[q] ? 'Logged' : 'Pending'}
                          <ArrowRight className="w-3 h-3 opacity-60" />
                        </Link>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent check-ins</h2>
        {data.checkins.length === 0 ? (
          <div className="text-sm text-slate-500">No check-ins logged yet.</div>
        ) : (
          <div className="space-y-2">
            {data.checkins.slice(0, 10).map(c => (
              <div key={c.id} className="card">
                <div className="card-body py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {c.employeeName} <span className="text-slate-400">·</span> {c.quarter}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(c.createdAt)}</div>
                      <div className="text-sm text-slate-700 mt-1.5">{c.comment}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
