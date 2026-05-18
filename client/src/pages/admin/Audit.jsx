import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function AdminAudit() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  const load = async (p = 1) => {
    const r = await api.get(`/admin/audit-logs?page=${p}&pageSize=20`);
    if (r.success) setData(r.data);
  };

  useEffect(() => { load(page); }, [page]);

  if (!data) return <Spinner label="Loading audit log…" />;

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Every post-lock change to any goal — who, what, when, and why."
      />

      {data.rows.length === 0 ? (
        <EmptyState icon={History} title="No audit entries yet" message="Audit logs are created when locked goals change or when admin unlocks a goal." />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Goal</th>
                    <th>Owner</th>
                    <th>Changed by</th>
                    <th>Field</th>
                    <th>Old → New</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(r => (
                    <tr key={r.id}>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(r.changedAt)}</td>
                      <td className="font-medium text-slate-800">{r.goalTitle || <span className="text-slate-400">—</span>}</td>
                      <td className="text-slate-600">{r.employeeName || '—'}</td>
                      <td className="text-slate-600">{r.changedByName}</td>
                      <td><span className="badge bg-slate-100 text-slate-700">{r.fieldChanged}</span></td>
                      <td className="text-xs">
                        <span className="text-slate-500">{r.oldValue ?? '—'}</span>
                        <span className="mx-1.5 text-slate-300">→</span>
                        <span className="text-slate-700 font-medium">{r.newValue ?? '—'}</span>
                      </td>
                      <td className="text-xs text-slate-600 max-w-xs truncate" title={r.reason || ''}>{r.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>Showing {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-2">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-slate-500">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1 px-2">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
