import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { Workflow, Plus, Trash2, Check, Play, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatDate, cn } from '../../lib/utils';

const TRIGGER_LABELS = {
  goal_not_submitted: 'Goal not submitted within',
  goal_not_approved: 'Manager has not approved within',
  checkin_missing: 'Quarterly check-in missing for'
};
const TARGET_LABELS = { employee: 'Employee', manager: 'Manager', admin: 'HR / Admin' };

export default function AdminEscalations() {
  const toast = useToast();
  const [rules, setRules] = useState(null);
  const [log, setLog] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: 'goal_not_submitted', thresholdDays: 7, escalateTo: 'manager', enabled: true });

  const load = async () => {
    const [r, l] = await Promise.all([
      api.get('/escalations/rules'),
      api.get('/escalations/log')
    ]);
    if (r.success) setRules(r.data.rules);
    if (l.success) setLog(l.data.rows);
  };
  useEffect(() => { load(); }, []);

  const runNow = async () => {
    const r = await api.post('/escalations/run');
    if (!r.success) return toast.error(r.error);
    toast.success(`Engine ran — ${r.data.fired} new escalation(s) created`);
    load();
  };

  const toggle = async (rule) => {
    const r = await api.put(`/escalations/rules/${rule.id}`, { enabled: !rule.enabled });
    if (!r.success) return toast.error(r.error);
    load();
  };

  const remove = async (rule) => {
    const r = await api.del(`/escalations/rules/${rule.id}`);
    if (!r.success) return toast.error(r.error);
    toast.success('Rule removed');
    load();
  };

  const add = async () => {
    if (!form.name.trim()) return toast.error('Rule name required');
    const r = await api.post('/escalations/rules', form);
    if (!r.success) return toast.error(r.error);
    toast.success('Rule added');
    setAddOpen(false);
    setForm({ name: '', trigger: 'goal_not_submitted', thresholdDays: 7, escalateTo: 'manager', enabled: true });
    load();
  };

  const resolve = async (id) => {
    const r = await api.post(`/escalations/log/${id}/resolve`);
    if (!r.success) return toast.error(r.error);
    load();
  };

  if (!rules || !log) return <Spinner label="Loading escalations…" />;

  return (
    <div>
      <PageHeader
        title="Escalations"
        subtitle="Rule-based engine that nudges employees, managers and HR when goals are stuck."
        actions={
          <>
            <button onClick={runNow} className="btn-secondary"><Play className="w-4 h-4" /> Run engine now</button>
            <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add rule</button>
          </>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Active rules</h2>
          {rules.length === 0 ? (
            <EmptyState icon={Workflow} title="No rules configured" message="Add a rule to start nudging stuck goals automatically." />
          ) : (
            <div className="space-y-3">
              {rules.map(r => (
                <div key={r.id} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800">{r.name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          {TRIGGER_LABELS[r.trigger]} <span className="font-semibold">{r.thresholdDays} day{r.thresholdDays === 1 ? '' : 's'}</span> → notify <span className="font-semibold">{TARGET_LABELS[r.escalateTo]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggle(r)} className={cn(
                          'p-1.5 rounded-lg',
                          r.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                        )}>
                          {r.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => remove(r)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent escalation log</h2>
          {log.length === 0 ? (
            <EmptyState icon={Workflow} title="No escalations fired yet" message="The engine runs every 5 minutes — or click 'Run engine now'." />
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {log.map(e => (
                <div key={e.id} className={cn('card', e.status === 'open' && 'border-amber-200')}>
                  <div className="card-body py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                          {e.status === 'open' ? <AlertTriangle className="w-3 h-3 text-amber-500" /> : <Check className="w-3 h-3 text-emerald-500" />}
                          <span>{formatDate(e.createdAt)}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-medium">{e.ruleName}</span>
                        </div>
                        <div className="text-sm text-slate-700">{e.message}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          To: <span className="font-medium">{e.targetName}</span>
                          {e.subjectName && <> · Subject: <span className="font-medium">{e.subjectName}</span></>}
                        </div>
                      </div>
                      {e.status === 'open' && (
                        <button onClick={() => resolve(e.id)} className="btn-ghost text-xs">
                          <Check className="w-3.5 h-3.5" /> Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add escalation rule"
        footer={
          <>
            <button onClick={() => setAddOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Add rule</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Rule name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Stalled draft goals" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Trigger</label>
              <select className="select" value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}>
                <option value="goal_not_submitted">Goal not submitted</option>
                <option value="goal_not_approved">Manager not approved</option>
                <option value="checkin_missing">Check-in missing</option>
              </select>
            </div>
            <div>
              <label className="label">Escalate to</label>
              <select className="select" value={form.escalateTo} onChange={e => setForm(f => ({ ...f, escalateTo: e.target.value }))}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">HR / Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Threshold (days)</label>
            <input className="input" type="number" min="1" value={form.thresholdDays} onChange={e => setForm(f => ({ ...f, thresholdDays: Number(e.target.value) }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
