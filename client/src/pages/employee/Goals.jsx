import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge, { LockedBadge } from '../../components/common/StatusBadge';
import WeightageMeter from '../../components/common/WeightageMeter';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import GoalForm from '../../components/common/GoalForm';
import Spinner from '../../components/common/Spinner';
import ProgressBar from '../../components/common/ProgressBar';
import { Plus, Pencil, Trash2, Send, Target, AlertTriangle, Info, Lock, Share2 } from 'lucide-react';
import { uomLabel, formatNumber } from '../../lib/utils';

export default function EmployeeGoals() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [modal, setModal] = useState({ open: false, mode: 'add', goal: null });
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    const r = await api.get('/goals');
    if (r.success) setData(r.data); else toast.error(r.error);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remainingWeight = useMemo(() => {
    if (!data) return 100;
    const exclude = modal.mode === 'edit' && modal.goal ? modal.goal.weightage : 0;
    return Math.round((100 - data.weightTotal + exclude) * 100) / 100;
  }, [data, modal]);

  const onAdd = async (payload) => {
    setBusy(true);
    const r = await api.post('/goals', payload);
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    toast.success('Goal added');
    setModal({ open: false, mode: 'add', goal: null });
    load();
  };

  const onEdit = async (payload) => {
    setBusy(true);
    const r = await api.put(`/goals/${modal.goal.id}`, payload);
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    toast.success('Goal updated');
    setModal({ open: false, mode: 'add', goal: null });
    load();
  };

  const onDelete = async () => {
    const r = await api.del(`/goals/${confirmDel.id}`);
    if (!r.success) return toast.error(r.error);
    toast.success('Goal deleted');
    setConfirmDel(null);
    load();
  };

  const onSubmitAll = async () => {
    setBusy(true);
    const r = await api.post('/goals/batch-submit');
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    toast.success(`${r.data.submitted} goal(s) submitted for approval`);
    load();
  };

  if (loading) return <Spinner label="Loading your goal sheet…" />;
  if (!data) return null;

  const { goals, weightTotal, canSubmit, limits } = data;
  const draftCount = goals.filter(g => g.status === 'draft' || g.status === 'rework').length;
  const canAddMore = goals.length < limits.maxGoals;

  return (
    <div>
      <PageHeader
        title="My Goal Sheet"
        subtitle={`FY26 cycle • Min ${limits.minWeightage}% per goal • Max ${limits.maxGoals} goals • Total weightage must equal 100%`}
        actions={
          <>
            <button
              onClick={onSubmitAll}
              disabled={!canSubmit || busy || draftCount === 0}
              className="btn-primary"
              title={canSubmit ? 'Submit all draft/rework goals' : 'Total must equal 100% first'}
            >
              <Send className="w-4 h-4" /> Submit for Approval
            </button>
            <button
              onClick={() => setModal({ open: true, mode: 'add', goal: null })}
              disabled={!canAddMore}
              className="btn-secondary"
              title={canAddMore ? 'Add a new goal' : `Max ${limits.maxGoals} goals reached`}
            >
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card lg:col-span-2">
          <div className="card-body">
            <WeightageMeter total={weightTotal} />
            {!canSubmit && draftCount > 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Adjust weightages so they sum to 100% before submitting.
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-xs uppercase tracking-wider text-slate-500">Goal stats</div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold tabular-nums">{goals.length}/{limits.maxGoals}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Draft</span><span className="font-semibold tabular-nums">{goals.filter(g=>g.status==='draft').length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Submitted</span><span className="font-semibold tabular-nums">{goals.filter(g=>g.status==='submitted').length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Approved</span><span className="font-semibold tabular-nums">{goals.filter(g=>g.status==='approved').length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Rework</span><span className="font-semibold tabular-nums">{goals.filter(g=>g.status==='rework').length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Locked</span><span className="font-semibold tabular-nums">{goals.filter(g=>g.isLocked).length}</span></div>
            </div>
          </div>
        </div>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet — create your first goal"
          message="Start by defining what success looks like for FY26. You can add up to 8 goals across thrust areas."
          action={<button onClick={() => setModal({ open: true, mode: 'add', goal: null })} className="btn-primary"><Plus className="w-4 h-4" />Add your first goal</button>}
        />
      ) : (
        <div className="space-y-3">
          {goals.map(g => {
            const latestScore = g.achievements && g.achievements.length
              ? g.achievements.reduce((acc, a) => a.computedScore !== null ? a : acc, null)
              : null;
            return (
              <div key={g.id} className="card">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="badge bg-slate-100 text-slate-700">{g.thrustArea}</span>
                        <StatusBadge status={g.status} />
                        {g.isLocked && <LockedBadge />}
                        {g.isShared ? <span className="badge-shared inline-flex items-center gap-1"><Share2 className="w-3 h-3" /> Shared</span> : null}
                      </div>
                      <h3 className="font-semibold text-slate-800 text-base">{g.title}</h3>
                      {g.description && <p className="text-sm text-slate-500 mt-1">{g.description}</p>}
                      {g.status === 'rework' && g.reworkNote && (
                        <div className="mt-2 inline-flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-xs">
                          <Info className="w-4 h-4 mt-0.5" />
                          <div><span className="font-semibold">Manager note:</span> {g.reworkNote}</div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6 lg:text-right text-sm shrink-0">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">UoM</div>
                        <div className="font-medium text-slate-700 mt-0.5">{uomLabel(g.uomType).split(' (')[0]}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Target</div>
                        <div className="font-semibold text-slate-800 tabular-nums mt-0.5">{formatNumber(g.target)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Weight</div>
                        <div className="font-semibold text-slate-800 tabular-nums mt-0.5">{g.weightage}%</div>
                      </div>
                    </div>
                  </div>

                  {latestScore && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>Latest score ({latestScore.quarter})</span>
                        <span className="font-semibold tabular-nums text-slate-700">{latestScore.computedScore !== null ? Math.round(latestScore.computedScore) + '%' : '—'}</span>
                      </div>
                      <ProgressBar score={latestScore.computedScore} />
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 justify-end">
                    {!g.isLocked && (g.status === 'draft' || g.status === 'rework') && !g.isShared && (
                      <button onClick={() => setConfirmDel(g)} className="btn-ghost text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                    {!g.isLocked && (
                      <button onClick={() => setModal({ open: true, mode: 'edit', goal: g })} className="btn-secondary">
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    )}
                    {g.isLocked && (
                      <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Locked — ask Admin to unlock to edit
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: 'add', goal: null })}
        title={modal.mode === 'edit' ? (modal.goal?.isShared ? 'Edit weightage (shared goal)' : 'Edit goal') : 'Add new goal'}
        size="lg"
      >
        <GoalForm
          initial={modal.mode === 'edit' ? modal.goal : null}
          onSubmit={modal.mode === 'edit' ? onEdit : onAdd}
          onCancel={() => setModal({ open: false, mode: 'add', goal: null })}
          busy={busy}
          remainingWeight={remainingWeight}
        />
      </Modal>

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Delete this goal?"
        footer={
          <>
            <button onClick={() => setConfirmDel(null)} className="btn-secondary">Cancel</button>
            <button onClick={onDelete} className="btn-danger">Delete</button>
          </>
        }
      >
        <p className="text-sm text-slate-600">"{confirmDel?.title}" will be permanently removed from your goal sheet.</p>
      </Modal>
    </div>
  );
}
