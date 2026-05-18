import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import KpiCard from '../../components/common/KpiCard';
import { Building2, Users, Target, CheckCircle2, Search } from 'lucide-react';
import { initials } from '../../lib/utils';

const ROLE_TONE = {
  employee: 'bg-slate-100 text-slate-700',
  manager: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700'
};

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/admin/overview').then(r => { if (r.success) setData(r.data); });
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!q.trim()) return data.rows;
    const term = q.trim().toLowerCase();
    return data.rows.filter(r =>
      r.name.toLowerCase().includes(term) ||
      r.email.toLowerCase().includes(term) ||
      (r.managerName || '').toLowerCase().includes(term)
    );
  }, [data, q]);

  if (!data) return <Spinner label="Loading org…" />;

  const stats = data.rows.reduce((s, r) => {
    s.total++;
    if (r.role === 'employee') s.employees++;
    if (r.role === 'manager') s.managers++;
    s.approvedGoals += r.approvedGoals || 0;
    s.totalGoals += r.totalGoals || 0;
    return s;
  }, { total: 0, employees: 0, managers: 0, approvedGoals: 0, totalGoals: 0 });

  return (
    <div>
      <PageHeader
        title="Organisation Overview"
        subtitle="Every employee, their goal status, and weightage completion."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="People" value={stats.total} icon={Building2} tone="brand" />
        <KpiCard label="Employees" value={stats.employees} icon={Users} tone="slate" />
        <KpiCard label="Goals Approved" value={stats.approvedGoals} icon={CheckCircle2} tone="green" />
        <KpiCard label="Goals Total" value={stats.totalGoals} icon={Target} tone="amber" />
      </div>

      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="search"
              className="input pl-9"
              placeholder="Search by name, email or manager…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Manager</th>
                <th className="text-center">Total</th>
                <th className="text-center">Draft</th>
                <th className="text-center">Submitted</th>
                <th className="text-center">Approved</th>
                <th className="text-center">Rework</th>
                <th className="text-right">Weight Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center">
                        {initials(r.name)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${ROLE_TONE[r.role]}`}>{r.role}</span></td>
                  <td className="text-slate-600">{r.managerName || <span className="text-slate-400">—</span>}</td>
                  <td className="text-center tabular-nums">{r.totalGoals}</td>
                  <td className="text-center tabular-nums">{r.draftGoals}</td>
                  <td className="text-center tabular-nums text-blue-600 font-medium">{r.submittedGoals || ''}</td>
                  <td className="text-center tabular-nums text-emerald-600 font-medium">{r.approvedGoals || ''}</td>
                  <td className="text-center tabular-nums text-amber-600 font-medium">{r.reworkGoals || ''}</td>
                  <td className={`text-right tabular-nums font-semibold ${Math.round(r.weightTotal) === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {Math.round(r.weightTotal)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
