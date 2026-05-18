import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { Users, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { initials, formatDate } from '../../lib/utils';

export default function ManagerTeam() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/manager/team').then(r => { if (r.success) setData(r.data); });
  }, []);

  if (!data) return <Spinner label="Loading team…" />;

  return (
    <div>
      <PageHeader
        title="Team Overview"
        subtitle="Direct reports, their goal status, and last check-in."
      />

      {data.reports.length === 0 ? (
        <EmptyState icon={Users} title="No direct reports" message="You have no employees mapped under you yet." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.reports.map(r => (
            <Link
              to={`/manager/team/${r.id}`}
              key={r.id}
              className="card hover:shadow-pop transition-shadow group"
            >
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold flex items-center justify-center">
                    {initials(r.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{r.name}</div>
                    <div className="text-xs text-slate-500 truncate">{r.email}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <Stat label="Total" value={r.goalCount} />
                  <Stat label="Submitted" value={r.submittedCount} tone="blue" />
                  <Stat label="Approved" value={r.approvedCount} tone="green" />
                  <Stat label="Rework" value={r.reworkCount} tone="amber" />
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
                  {r.submittedCount > 0 ? (
                    <><AlertCircle className="w-3.5 h-3.5 text-blue-500" /><span>Awaiting your review</span></>
                  ) : r.lastCheckinAt ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span>Last check-in: {formatDate(r.lastCheckinAt)}</span></>
                  ) : (
                    <><Clock className="w-3.5 h-3.5 text-slate-400" /><span>No check-in yet</span></>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const colorMap = {
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    default: 'text-slate-700'
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`font-semibold tabular-nums ${colorMap[tone || 'default']}`}>{value}</span>
    </div>
  );
}
