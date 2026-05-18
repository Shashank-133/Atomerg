import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ProgressBar from '../../components/common/ProgressBar';
import { ClipboardCheck, Save, AlertTriangle } from 'lucide-react';
import { uomLabel, formatNumber, scoreTextColor } from '../../lib/utils';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'on_track',    label: 'On track' },
  { value: 'completed',   label: 'Completed' }
];

function computeLocalScore(uomType, target, actual) {
  if (actual === null || actual === undefined || actual === '' || isNaN(Number(actual))) return null;
  const a = Number(actual), t = Number(target);
  if (uomType === 'numeric_min') return Math.min((a / (t || 1)) * 100, 100);
  if (uomType === 'numeric_max') return a === 0 ? 100 : (a <= t ? 100 : Math.min((t / a) * 100, 100));
  if (uomType === 'timeline')    return a <= t ? 100 : 0;
  if (uomType === 'zero')        return a === 0 ? 100 : 0;
  return null;
}

export default function EmployeeAchievements() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [cycle, setCycle] = useState({});
  const [quarter, setQuarter] = useState('Q1');
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    const [g, cy] = await Promise.all([api.get('/goals'), api.get('/cycle')]);
    if (g.success) setData(g.data);
    if (cy.success) {
      const map = {};
      for (const r of cy.data.cycle) map[r.key] = !!r.isOpen;
      setCycle(map);
    }
  };

  useEffect(() => { load(); }, []);

  const approvedGoals = useMemo(
    () => (data ? data.goals.filter(g => g.status === 'approved') : []),
    [data]
  );

  const currentEntries = useMemo(() => {
    const map = {};
    for (const g of approvedGoals) {
      const ach = g.achievements?.find(a => a.quarter === quarter);
      map[g.id] = {
        actual: ach?.actual ?? '',
        progressStatus: ach?.progressStatus || 'not_started',
        score: ach?.computedScore ?? null
      };
    }
    return map;
  }, [approvedGoals, quarter]);

  const getRow = (gid) => edits[`${gid}_${quarter}`] || currentEntries[gid] || { actual: '', progressStatus: 'not_started', score: null };

  const setRow = (gid, patch) => setEdits(prev => ({
    ...prev,
    [`${gid}_${quarter}`]: { ...getRow(gid), ...patch }
  }));

  const save = async (goal) => {
    const row = getRow(goal.id);
    setSavingId(goal.id);
    const r = await api.post('/achievements', {
      goalId: goal.id,
      quarter,
      actual: row.actual === '' ? null : Number(row.actual),
      progressStatus: row.progressStatus
    });
    setSavingId(null);
    if (!r.success) return toast.error(r.error);
    toast.success(`${quarter} achievement saved`);
    load();
  };

  if (!data) return <Spinner label="Loading…" />;

  const quarterOpen = cycle[quarter] !== false;

  return (
    <div>
      <PageHeader
        title="Quarterly Achievements"
        subtitle="Log actuals against each approved goal. Scores update instantly."
      />

      <div className="card mb-5">
        <div className="card-body flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-700">Cycle window</div>
            <div className="inline-flex bg-slate-100 rounded-lg p-1">
              {QUARTERS.map(q => (
                <button
                  key={q}
                  onClick={() => setQuarter(q)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${quarter === q ? 'bg-white shadow-sm text-brand-700' : 'text-slate-600'}`}
                >{q}</button>
              ))}
            </div>
          </div>
          <div className={`text-xs px-3 py-1 rounded-full ${quarterOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {quarterOpen ? `${quarter} window is OPEN for entry` : `${quarter} window is closed by Admin`}
          </div>
        </div>
      </div>

      {!quarterOpen && (
        <div className="mb-4 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          Admin has closed {quarter}. Re-open it from the Cycle Windows page to capture actuals.
        </div>
      )}

      {approvedGoals.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No approved goals yet"
          message="Once your manager approves your goal sheet, you can log quarterly achievements here."
        />
      ) : (
        <div className="table-wrap bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Goal</th>
                <th>UoM</th>
                <th className="text-right">Target</th>
                <th className="w-40">Actual</th>
                <th className="w-44">Status</th>
                <th className="w-36">Score</th>
                <th className="w-28 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {approvedGoals.map(g => {
                const row = getRow(g.id);
                const localScore = computeLocalScore(g.uomType, g.target, row.actual);
                const score = row.actual !== '' && row.actual !== null ? localScore : row.score;
                return (
                  <tr key={g.id}>
                    <td>
                      <div className="font-medium text-slate-800">{g.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{g.thrustArea} · {g.weightage}%</div>
                    </td>
                    <td className="text-xs text-slate-500">{uomLabel(g.uomType).split(' (')[0]}</td>
                    <td className="text-right tabular-nums">{formatNumber(g.target)}</td>
                    <td>
                      <input
                        className="input py-1.5"
                        type="number"
                        disabled={!quarterOpen}
                        value={row.actual}
                        onChange={e => setRow(g.id, { actual: e.target.value })}
                        placeholder={g.uomType === 'zero' ? '0' : '—'}
                      />
                    </td>
                    <td>
                      <select
                        className="select py-1.5"
                        disabled={!quarterOpen}
                        value={row.progressStatus}
                        onChange={e => setRow(g.id, { progressStatus: e.target.value })}
                      >
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className={`text-sm font-semibold tabular-nums ${scoreTextColor(score)}`}>
                          {score === null ? '—' : `${Math.round(score)}%`}
                        </div>
                        <ProgressBar score={score} />
                      </div>
                    </td>
                    <td className="text-right">
                      <button
                        disabled={!quarterOpen || savingId === g.id}
                        onClick={() => save(g)}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        <Save className="w-3.5 h-3.5" /> {savingId === g.id ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
