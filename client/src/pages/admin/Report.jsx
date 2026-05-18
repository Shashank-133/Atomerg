import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import PageHeader from '../../components/layout/PageHeader';
import { FileDown, FileText, Loader2 } from 'lucide-react';

export default function AdminReport() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await api.download('/admin/report/csv', `achievement-report-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Report downloaded');
    } catch (e) {
      toast.error('Download failed: ' + e.message);
    }
    setBusy(false);
  };

  return (
    <div>
      <PageHeader
        title="Achievement Report"
        subtitle="Export-ready snapshot of every employee's planned vs. actual achievements."
      />

      <div className="card max-w-2xl">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">Achievement Report (CSV)</h3>
              <p className="text-sm text-slate-600 mt-1">
                Columns: Employee, Goal Title, Thrust Area, UoM, Target, Weightage, Status,
                Q1–Q4 Actuals and Scores.
              </p>
              <button onClick={download} disabled={busy} className="btn-primary mt-4">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {busy ? 'Generating…' : 'Download CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-2xl text-xs text-slate-500">
        Tip: Open the CSV in Excel — every row is one (Employee × Goal). Q-column pairs report
        the actual logged that quarter and the computed score (rounded to integer).
      </div>
    </div>
  );
}
