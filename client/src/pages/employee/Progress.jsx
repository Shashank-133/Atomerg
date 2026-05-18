import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ProgressBar from '../../components/common/ProgressBar';
import KpiCard from '../../components/common/KpiCard';
import StatusBadge, { LockedBadge } from '../../components/common/StatusBadge';
import { BarChart3, Target, Trophy, Activity } from 'lucide-react';
import { scoreTextColor, formatNumber } from '../../lib/utils';

export default function EmployeeProgress() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/goals').then(r => { if (r.success) setData(r.data); });
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const approved = data.goals.filter(g => g.status === 'approved');
    const allScores = [];
    for (const g of data.goals) {
      for (const a of g.achievements || []) {
        if (a.computedScore !== null && a.computedScore !== undefined) allScores.push(a.computedScore);
      }
    }
    const avg = allScores.length ? Math.round(allScores.reduce((s, x) => s + x, 0) / allScores.length) : null;
    return {
      total: data.goals.length,
      approved: approved.length,
      avg
    };
  }, [data]);

  if (!data) return <Spinner label="Loading…" />;

  return (
    <div>
      <PageHeader
        title="Progress"
        subtitle="A glance at your achievement scores across all approved goals."
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Approved Goals" value={stats.approved} icon={Target} tone="green" />
        <KpiCard label="Total Goals" value={stats.total} icon={Activity} tone="brand" />
        <KpiCard label="Average Score" value={stats.avg === null ? '—' : `${stats.avg}%`} icon={Trophy} tone="amber" hint="Across all logged quarters" />
      </div>

      {data.goals.length === 0 ? (
        <EmptyState icon={BarChart3} title="No goals to track yet" message="Add and submit goals to start seeing progress." />
      ) : (
        <div className="space-y-3">
          {data.goals.map(g => {
            const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
              const a = g.achievements?.find(x => x.quarter === q);
              return { quarter: q, score: a?.computedScore ?? null, actual: a?.actual ?? null };
            });
            const avg = quarters.filter(q => q.score !== null);
            const avgScore = avg.length ? Math.round(avg.reduce((s, x) => s + x.score, 0) / avg.length) : null;
            return (
              <div key={g.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="badge bg-slate-100 text-slate-700">{g.thrustArea}</span>
                        <StatusBadge status={g.status} />
                        {g.isLocked && <LockedBadge />}
                      </div>
                      <h3 className="font-semibold text-slate-800">{g.title}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">Target: {formatNumber(g.target)} · Weight: {g.weightage}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-slate-500">Avg Score</div>
                      <div className={`text-2xl font-bold tabular-nums ${scoreTextColor(avgScore)}`}>
                        {avgScore === null ? '—' : `${avgScore}%`}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {quarters.map(q => (
                      <div key={q.quarter}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">{q.quarter}</span>
                          <span className={`tabular-nums ${scoreTextColor(q.score)} font-semibold`}>
                            {q.score === null ? '—' : `${Math.round(q.score)}%`}
                          </span>
                        </div>
                        <ProgressBar score={q.score} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
