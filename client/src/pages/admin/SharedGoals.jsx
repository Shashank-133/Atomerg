import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import { Share2, Users, Check } from 'lucide-react';
import { uomLabel, initials } from '../../lib/utils';

const THRUST_AREAS = [
  'Revenue Growth', 'Operational Excellence', 'Customer Success', 'Product Launch',
  'People & Culture', 'Safety & Compliance', 'Innovation', 'Cost Optimisation'
];
const UOM_TYPES = ['numeric_min', 'numeric_max', 'timeline', 'zero'];

export default function AdminSharedGoals() {
  const toast = useToast();
  const [employees, setEmployees] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [form, setForm] = useState({
    thrustArea: 'Operational Excellence',
    title: '',
    description: '',
    uomType: 'numeric_min',
    target: '',
    weightage: 10
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/admin/employees').then(r => { if (r.success) setEmployees(r.data.employees); });
  }, []);

  if (!employees) return <Spinner label="Loading…" />;

  const toggleAll = (checked) => {
    if (checked) setSelected(new Set(employees.map(e => e.id)));
    else setSelected(new Set());
  };
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (selected.size === 0) return toast.error('Pick at least one employee');
    if (!form.title.trim()) return toast.error('Title required');
    setBusy(true);
    const r = await api.post('/admin/shared-goal', {
      ...form,
      target: form.uomType === 'zero' ? 0 : Number(form.target),
      weightage: Number(form.weightage),
      employeeIds: Array.from(selected)
    });
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    toast.success(`Shared goal pushed to ${r.data.pushedTo} employee(s)`);
    setSelected(new Set());
    setForm({ thrustArea: 'Operational Excellence', title: '', description: '', uomType: 'numeric_min', target: '', weightage: 10 });
  };

  return (
    <div>
      <PageHeader
        title="Shared Organisational Goals"
        subtitle="Push a departmental KPI to multiple employees. Recipients can only adjust weightage."
      />

      <form onSubmit={submit} className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="card">
            <div className="card-body space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Share2 className="w-4 h-4 text-brand-600" /> Goal details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Thrust Area</label>
                  <select className="select" value={form.thrustArea} onChange={e => setForm(f => ({ ...f, thrustArea: e.target.value }))}>
                    {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit of Measurement</label>
                  <select className="select" value={form.uomType} onChange={e => setForm(f => ({ ...f, uomType: e.target.value }))}>
                    {UOM_TYPES.map(u => <option key={u} value={u}>{uomLabel(u)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Title</label>
                <input className="input" placeholder="e.g. Adopt new safety protocols across teams" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="textarea" placeholder="What success looks like, why now, how to deliver." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Target</label>
                  <input className="input" type="number" disabled={form.uomType === 'zero'} value={form.uomType === 'zero' ? 0 : form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Default weightage (%)</label>
                  <input className="input" type="number" min="10" max="100" value={form.weightage} onChange={e => setForm(f => ({ ...f, weightage: e.target.value }))} />
                  <p className="text-xs text-slate-500 mt-1">Will be auto-capped if recipient's sheet would exceed 100%.</p>
                </div>
              </div>
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            <Check className="w-4 h-4" /> {busy ? 'Pushing…' : `Push goal to ${selected.size} employee${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-brand-600" /> Recipients</h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="checkbox" checked={selected.size === employees.length} onChange={e => toggleAll(e.target.checked)} className="rounded" />
                  Select all
                </label>
              </div>
              <div className="max-h-96 overflow-y-auto -mx-2 px-2 space-y-1">
                {employees.map(e => {
                  const checked = selected.has(e.id);
                  return (
                    <label key={e.id} className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer border ${checked ? 'border-brand-300 bg-brand-50/40' : 'border-transparent hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleOne(e.id)} className="rounded" />
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-center">
                        {initials(e.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{e.name}</div>
                        <div className="text-xs text-slate-500 truncate">Manager: {e.managerName || '—'}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
