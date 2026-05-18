import { useState, useEffect } from 'react';
import { uomLabel } from '../../lib/utils';

const THRUST_AREAS = [
  'Revenue Growth', 'Operational Excellence', 'Customer Success', 'Product Launch',
  'People & Culture', 'Safety & Compliance', 'Innovation', 'Cost Optimisation'
];

const UOM_TYPES = ['numeric_min', 'numeric_max', 'timeline', 'zero'];

export default function GoalForm({ initial, onSubmit, onCancel, busy, remainingWeight }) {
  const [form, setForm] = useState({
    thrustArea: 'Revenue Growth',
    title: '',
    description: '',
    uomType: 'numeric_min',
    target: '',
    weightage: '',
    ...(initial || {})
  });

  useEffect(() => {
    if (initial) setForm(prev => ({ ...prev, ...initial }));
  }, [initial]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e?.preventDefault?.();
    const payload = { ...form };
    if (payload.uomType === 'zero') payload.target = 0;
    else payload.target = Number(payload.target);
    payload.weightage = Number(payload.weightage);
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Thrust Area</label>
          <select className="select" value={form.thrustArea} onChange={e => update('thrustArea', e.target.value)}>
            {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Unit of Measurement</label>
          <select className="select" value={form.uomType} onChange={e => update('uomType', e.target.value)}>
            {UOM_TYPES.map(u => <option key={u} value={u}>{uomLabel(u)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Goal Title</label>
        <input className="input" placeholder="e.g. Increase quarterly sales by 15%" value={form.title} onChange={e => update('title', e.target.value)} />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea className="textarea" placeholder="Add context, success criteria, dependencies…" value={form.description || ''} onChange={e => update('description', e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{form.uomType === 'zero' ? 'Target (auto: 0)' : form.uomType === 'timeline' ? 'Target (days)' : 'Target'}</label>
          <input
            className="input"
            type="number"
            disabled={form.uomType === 'zero'}
            value={form.uomType === 'zero' ? 0 : form.target}
            onChange={e => update('target', e.target.value)}
            placeholder={form.uomType === 'numeric_min' ? 'e.g. 5000000' : form.uomType === 'numeric_max' ? 'e.g. 24' : 'e.g. 90'}
          />
          {form.uomType === 'numeric_min' && <p className="text-xs text-slate-500 mt-1">Higher is better — score = Actual ÷ Target.</p>}
          {form.uomType === 'numeric_max' && <p className="text-xs text-slate-500 mt-1">Lower is better — score = Target ÷ Actual.</p>}
          {form.uomType === 'timeline'    && <p className="text-xs text-slate-500 mt-1">Deadline-based — 100 if delivered on time, else 0.</p>}
          {form.uomType === 'zero'        && <p className="text-xs text-slate-500 mt-1">Zero-is-success — 100 if Actual = 0, else 0.</p>}
        </div>
        <div>
          <label className="label">Weightage (%)</label>
          <input
            className="input"
            type="number"
            min="10" max="100" step="1"
            value={form.weightage}
            onChange={e => update('weightage', e.target.value)}
            placeholder={`min 10, max ${remainingWeight !== undefined ? Math.max(10, remainingWeight) : 100}`}
          />
          {remainingWeight !== undefined && (
            <p className="text-xs text-slate-500 mt-1">{remainingWeight}% remaining on your goal sheet.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : (initial?.id ? 'Save changes' : 'Add goal')}
        </button>
      </div>
    </form>
  );
}
