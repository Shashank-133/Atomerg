import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function EmptyState({ icon: Icon = Inbox, title, message, action, className }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center px-6 py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50',
      className
    )}>
      <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {message && <p className="mt-1 text-sm text-slate-500 max-w-md">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
