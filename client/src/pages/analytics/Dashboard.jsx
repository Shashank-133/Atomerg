import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import KpiCard from '../../components/common/KpiCard';
import EmptyState from '../../components/common/EmptyState';
import {
  Users, Target, Send, CheckCircle2, Trophy,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts';

const PALETTE = ['#3563de', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#84cc16', '#f43f5e'];

export default function Analytics() {
  const [kpis, setKpis] = useState(null);
  const [managerRows, setManagerRows] = useState(null);
  const [thrust, setThrust] = useState(null);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    api.get('/analytics/kpis').then(r => r.success && setKpis(r.data));
    api.get('/analytics/manager-completion').then(r => r.success && setManagerRows(r.data.rows));
    api.get('/analytics/thrust-distribution').then(r => r.success && setThrust(r.data.rows));
    api.get('/analytics/quarterly-trend').then(r => r.success && setTrend(r.data.rows));
  }, []);

  if (!kpis || !managerRows || !thrust || !trend) return <Spinner label="Loading analytics…" />;

  const noChartData = thrust.length === 0 && managerRows.length === 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Quarter-on-Quarter trends, goal distribution, and manager effectiveness."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Total Employees" value={kpis.totalEmployees} icon={Users} tone="brand" />
        <KpiCard label="Total Goals" value={kpis.totalGoals} icon={Target} tone="slate" />
        <KpiCard label="Submitted" value={kpis.submittedGoals} icon={Send} tone="amber" />
        <KpiCard label="Approved" value={kpis.approvedGoals} icon={CheckCircle2} tone="green" />
        <KpiCard label="Avg Score" value={kpis.avgScore === null ? '—' : `${kpis.avgScore}%`} icon={Trophy} tone="purple" hint="Across logged quarters" />
      </div>

      {noChartData ? (
        <EmptyState icon={BarChart3} title="Not enough data yet" message="Charts will populate as goals and check-ins are logged." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="font-semibold text-slate-800">Manager Check-in Completion</div>
                <div className="text-xs text-slate-500">Per-manager rate across open quarters</div>
              </div>
            </div>
            <div className="card-body">
              {managerRows.length === 0 ? (
                <div className="text-sm text-slate-500 py-10 text-center">No managers yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={managerRows} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="manager" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} formatter={(v, n) => [`${v}%`, 'Completion']} />
                    <Bar dataKey="completionRate" fill="#3563de" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="font-semibold text-slate-800">Goal Distribution by Thrust Area</div>
                <div className="text-xs text-slate-500">Where the org is investing effort</div>
              </div>
            </div>
            <div className="card-body">
              {thrust.length === 0 ? (
                <div className="text-sm text-slate-500 py-10 text-center">No goals yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={thrust} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {thrust.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="font-semibold text-slate-800">Average Team Score — Q1 to Q4</div>
            <div className="text-xs text-slate-500">Quarter-on-Quarter score trend</div>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend} margin={{ left: -10, right: 10 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} formatter={(v) => [`${v}%`, 'Avg score']} />
              <Line type="monotone" dataKey="avgScore" stroke="#3563de" strokeWidth={2.5} dot={{ r: 5, fill: '#3563de' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
