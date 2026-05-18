import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ProgressBar from '../../components/common/ProgressBar';
import { ChevronLeft, CheckCircle2, Save, ClipboardCheck } from 'lucide-react';
import { uomLabel, formatNumber, scoreTextColor } from '../../lib/utils';

const STATUS_LABEL = {
  not_started: 'Not started',
  on_track: 'On track',
  completed: 'Completed'
};

export default function CheckInDetail() {
  const { employeeId, quarter } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await api.get(`/manager/checkins/${employeeId}/${quarter}`);
    if (r.success) {
      setData(r.data);
      setComment(r.data.checkin?.comment || '');
    } else toast.error(r.error);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [employeeId, quarter]);

  if (!data) return <Spinner label="Loading…" />;

  const save = async (status) => {
    if (!comment.trim()) return toast.error('Please add a check-in comment');
    setBusy(true);
    const r = await api.post('/manager/checkins', {
      employeeId: Number(employeeId), quarter, comment, status
    });
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    toast.success(status === 'completed' ? 'Check-in completed' : 'Draft saved');
    load();
  };

  return (
    <div>
      <button onClick={() => navigate('/manager/checkins')} className="btn-ghost mb-3 -ml-2">
        <ChevronLeft className="w-4 h-4" /> Back to check-ins
      </button>

      <PageHeader
        title={`${quarter} Check-in: ${data.employee.name}`}
        subtitle="Planned vs Actual for each approved goal, with structured manager comment."
      />

      {data.goals.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No approved goals" message="This employee has no approved goals to check in on yet." />
      ) : (
        <div className="card mb-5">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>UoM</th>
                  <th className="text-right">Planned</th>
                  <th className="text-right">Actual</th>
                  <th>Status</th>
                  <th className="w-44">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.goals.map(g => {
                  const a = g.quarter;
                  return (
                    <tr key={g.id}>
                      <td>
                        <div className="font-medium text-slate-800">{g.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{g.thrustArea} · {g.weightage}%</div>
                      </td>
                      <td className="text-xs text-slate-500">{uomLabel(g.uomType).split(' (')[0]}</td>
                      <td className="text-right tabular-nums">{formatNumber(g.target)}</td>
                      <td className="text-right tabular-nums">
                        {a && a.actual !== null && a.actual !== undefined ? formatNumber(a.actual) : <span className="text-slate-400">—</span>}
                      </td>
                      <td>
                        {a?.progressStatus
                          ? <span className="text-xs text-slate-600">{STATUS_LABEL[a.progressStatus]}</span>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td>
                        {a?.computedScore !== null && a?.computedScore !== undefined ? (
                          <div className="space-y-1">
                            <div className={`text-xs font-semibold tabular-nums ${scoreTextColor(a.computedScore)}`}>
                              {Math.round(a.computedScore)}%
                            </div>
                            <ProgressBar score={a.computedScore} />
                          </div>
                        ) : <span className="text-xs text-slate-400">Not logged</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-800">Manager Check-in Comment</h3>
              <p className="text-xs text-slate-500">Document the discussion, key risks, asks, and what was agreed.</p>
            </div>
            {data.checkin?.status === 'completed' && (
              <span className="badge bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Logged
              </span>
            )}
          </div>
          <textarea
            className="textarea min-h-[140px]"
            placeholder="Discussed Q-on-Q trends, surfaced blocker on supply lead times. Agreed to revisit Q3 target after July review."
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => save('draft')} disabled={busy} className="btn-secondary">
              <Save className="w-4 h-4" /> Save draft
            </button>
            <button onClick={() => save('completed')} disabled={busy} className="btn-primary">
              <CheckCircle2 className="w-4 h-4" /> Mark check-in complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
