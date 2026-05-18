import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Spinner({ className, label }) {
  return (
    <div className={cn('flex items-center gap-2 text-slate-500 text-sm', className)}>
      <Loader2 className="w-4 h-4 animate-spin" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Spinner label={label} className="text-base" />
    </div>
  );
}
