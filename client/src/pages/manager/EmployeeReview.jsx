import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import StatusBadge, { LockedBadge } from '../../components/common/StatusBadge';
import WeightageMeter from '../../components/common/WeightageMeter';
import { ChevronLeft, Check, RotateCcw, Pencil, Target, Save, Info } from 'lucide-react';
import { uomLabel, formatNumber, initials } from '../../lib/utils';

export default function EmployeeReview() {
  const { employeeId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [rowEdit, setRowEdit] = useState({});
  const [approve, setApprove] = useState({ open: false, goal: null, note: '' });
  const [returnDlg, setReturnDlg] = useState({ open: false, goal: null, note: '' });

  const load = async () => {
    const r = await api.get(`/manager/team/${employeeId}/goals`);
    if (r.success) setData(r.data);
    else toast.error(r.error);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [employeeId]);

  if (!data) return <Spinner label="Loading goal sheet…" />;

  const setField = (gid, key, value) => setRowEdit(s => ({ ...s, [gid]: { ...(s[gid] || {}), [key]: value } }));
  const getField = (g, key) => {
    if (rowEdit[g.id] && rowEdit[g.id][key] !== undefined) return rowEdit[g.id][key];
    return g[key];
  };

  const saveInline = async (g) => {
    const target = Number(getField(g, 'target'));
    const weightage = Number(getField(g, 'weightage'));
    const r = await api.put(`/manager/goals/${g.id}`, { target, weightage });
    if (!r.success) return toast.error(r.error);
    toast.success(`Updated "${g.title}"`);
    setRowEdit(s => { const c = { ...s }; delete c[g.id]; return c; });
    load();
  };

  const doApprove = async () => {
    const r = await api.post(`/manager/goals/${approve.goal.id}/approve`, { note: approve.note });
    if (!r.success) return toast.error(r.error);
    toast.success('Goal approved and locked');
    setApprove({ open: false, goal: null, note: '' });
    load();
  };

  const doReturn = async () => {
    if (!returnDlg.note || returnDlg.note.trim().length < 3) {
      return toast.error('Add a rework note (3+ characters)');
    }
    const r = await api.post(`/manager/goals/${returnDlg.goal.id}/return`, { note: returnDlg.note });
    if (!r.success) return toast.error(r.error);
    toast.success('Returned for rework');
    setReturnDlg({ open: false, goal: null, note: '' });
    load();
  };

  return (
    <div>
      <button onClick={() => navigate('/manager/team')} className="btn-ghost mb-3 -ml-2">
        <ChevronLeft className="w-4 h-4" /> Back to team
      </button>

      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold flex items-center justify-center">
              {initials(data.employee.name)}
            </div>
            <span>{data.employee.name}</span>
          </div>
        }
        subtitle={`Goal sheet • ${data.employee.email} • Total weightage ${data.weightTotal}%`}
      />

      <div className="card mb-5">
        <div className="card-body">
          <WeightageMeter total={data.weightTotal} />
        </div>
      </div>

      {data.goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" message="This employee hasn't created any goals." />
      ) : (
        <div className="space-y-3">
          {data.goals.map(g => {
            const editing = !!rowEdit[g.id];
            const submitted = g.status === 'submitted';
            const canInlineEdit = submitted && !g.isLocked;
            return (
              <div key={g.id} className="card">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="badge bg-slate-100 text-slate-700">{g.thrustArea}</span>
                        <StatusBadge status={g.status} />
                        {g.isLocked && <LockedBadge />}
                      </div>
                      <h3 className="font-semibold text-slate-800">{g.title}</h3>
                      {g.description && <p className="text-sm text-slate-500 mt-1">{g.description}</p>}
                      {g.reworkNote && g.status === 'rework' && (
                        <div className="mt-2 inline-flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-xs">
                          <Info className="w-4 h-4 mt-0.5" /> Your rework note: {g.reworkNote}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 lg:gap-4 items-end shrink-0">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">UoM</div>
                        <div className="text-sm text-slate-700">{uomLabel(g.uomType).split(' (')[0]}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Target</div>
                        {canInlineEdit && editing ? (
                          <input
                            type="number"
                            className="input py-1 w-28"
                            value={getField(g, 'target')}
                            onChange={e => setField(g.id, 'target', e.target.value)}
                            disabled={g.uomType === 'zero'}
                          />
                        ) : (
                          <div className="text-sm font-semibold tabular-nums text-slate-800">{formatNumber(g.target)}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Weight</div>
                        {canInlineEdit && editing ? (
                          <input
                            type="number"
                            className="input py-1 w-20"
                            value={getField(g, 'weightage')}
                            onChange={e => setField(g.id, 'weightage', e.target.value)}
                          />
                        ) : (
                          <div className="text-sm font-semibold tabular-nums text-slate-800">{g.weightage}%</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {canInlineEdit && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 justify-end">
                      {editing ? (
                        <>
                          <button onClick={() => setRowEdit(s => { const c={...s}; delete c[g.id]; return c; })} className="btn-secondary">Cancel</button>
                          <button onClick={() => saveInline(g)} className="btn-secondary"><Save className="w-4 h-4" /> Save changes</button>
                        </>
                      ) : (
                        <button onClick={() => setField(g.id, '__editing', true)} className="btn-secondary">
                          <Pencil className="w-4 h-4" /> Edit inline
                        </button>
                      )}
                      <button onClick={() => setReturnDlg({ open: true, goal: g, note: '' })} className="btn-secondary text-amber-700 border-amber-200 hover:bg-amber-50">
                        <RotateCcw className="w-4 h-4" /> Return for rework
                      </button>
                      <button onClick={() => setApprove({ open: true, goal: g, note: '' })} className="btn-primary">
                        <Check className="w-4 h-4" /> Approve & lock
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={approve.open}
        onClose={() => setApprove({ open: false, goal: null, note: '' })}
        title={`Approve "${approve.goal?.title || ''}"`}
        footer={
          <>
            <button onClick={() => setApprove({ open: false, goal: null, note: '' })} className="btn-secondary">Cancel</button>
            <button onClick={doApprove} className="btn-primary"><Check className="w-4 h-4" /> Approve & lock</button>
          </>
        }
      >
        <p className="text-sm text-slate-600 mb-3">The goal will be locked after approval. Any later edits will be audit-logged.</p>
        <label className="label">Approval note (optional)</label>
        <textarea className="textarea" placeholder="e.g. Stretch but achievable — let's revisit at Q2 check-in." value={approve.note} onChange={e => setApprove(s => ({ ...s, note: e.target.value }))} />
      </Modal>

      <Modal
        open={returnDlg.open}
        onClose={() => setReturnDlg({ open: false, goal: null, note: '' })}
        title={`Return "${returnDlg.goal?.title || ''}" for rework`}
        footer={
          <>
            <button onClick={() => setReturnDlg({ open: false, goal: null, note: '' })} className="btn-secondary">Cancel</button>
            <button onClick={doReturn} className="btn-danger"><RotateCcw className="w-4 h-4" /> Send back for rework</button>
          </>
        }
      >
        <p className="text-sm text-slate-600 mb-3">A rework note is required so the employee knows what to change.</p>
        <label className="label">Rework note <span className="text-red-500">*</span></label>
        <textarea className="textarea" placeholder="e.g. Split this into two milestones — target seems too ambitious." value={returnDlg.note} onChange={e => setReturnDlg(s => ({ ...s, note: e.target.value }))} />
      </Modal>
    </div>
  );
}
