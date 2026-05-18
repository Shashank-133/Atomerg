import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { Unlock, Search, ShieldAlert } from 'lucide-react';

export default function AdminUnlock() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    const r = await api.get('/admin/locked-goals' + (q ? `?q=${encodeURIComponent(q)}` : ''));
    if (r.success) setRows(r.data.rows);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id); /* eslint-disable-next-line */ }, [q]);

  const doUnlock = async () => {
    if (!reason.trim() || reason.trim().length < 3) return toast.error('Provide an unlock reason (min 3 chars)');
    const r = await api.post(`/admin/unlock/${target.id}`, { reason: reason.trim() });
    if (!r.success) return toast.error(r.error);
    toast.success('Goal unlocked — audit logged');
    setTarget(null);
    setReason('');
    load();
  };

  if (!rows) return <Spinner label="Loading locked goals…" />;

  return (
    <div>
      <PageHeader
        title="Unlock Goals"
        subtitle="Exception handling — search any locked goal and unlock it with a reason. Every unlock is audit-logged."
      />

      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by goal title or employee name…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Unlock} title="No locked goals found" message="There are no locked goals matching your search." />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Owner</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Weight</th>
                  <th className="text-right w-32">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-medium text-slate-800">{r.title}</div>
                      <div className="text-xs text-slate-500">{r.thrustArea}</div>
                    </td>
                    <td>
                      <div className="text-sm text-slate-800">{r.employeeName}</div>
                      <div className="text-xs text-slate-500">{r.employeeEmail}</div>
                    </td>
                    <td className="text-center"><span className="badge bg-purple-100 text-purple-700">Locked</span></td>
                    <td className="text-right tabular-nums">{r.weightage}%</td>
                    <td className="text-right">
                      <button onClick={() => { setTarget(r); setReason(''); }} className="btn-secondary py-1 px-2 text-xs">
                        <Unlock className="w-3.5 h-3.5" /> Unlock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={`Unlock "${target?.title || ''}"`}
        footer={
          <>
            <button onClick={() => setTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={doUnlock} className="btn-danger"><Unlock className="w-4 h-4" /> Unlock & log</button>
          </>
        }
      >
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm mb-4">
          <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
          Unlocking allows the employee or manager to edit a previously-approved goal. This action is permanent and audit-logged.
        </div>
        <label className="label">Reason for unlock <span className="text-red-500">*</span></label>
        <textarea className="textarea" placeholder="e.g. Realignment after Q1 business review — target needs to drop from 5M to 4M." value={reason} onChange={e => setReason(e.target.value)} />
      </Modal>
    </div>
  );
}
