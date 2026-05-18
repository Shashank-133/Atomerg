import { cn } from '../../lib/utils';

export default function WeightageMeter({ total, target = 100, hint }) {
  const pct = Math.max(0, Math.min(100, (total / target) * 100));
  const isExact = Math.abs(total - target) < 0.0001;
  const isOver = total > target;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="font-medium text-slate-700">Total Weightage</div>
        <div className={cn(
          'font-semibold tabular-nums',
          isExact && 'text-emerald-600',
          isOver && 'text-red-600',
          !isExact && !isOver && 'text-slate-600'
        )}>
          {Math.round(total * 100) / 100}% / {target}%
        </div>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isExact ? 'bg-emerald-500'
              : isOver ? 'bg-red-500'
              : pct >= 70 ? 'bg-brand-500'
              : 'bg-brand-400'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-slate-500">
        {isExact
          ? 'Ready to submit — weightage is exactly 100%.'
          : isOver
          ? `Over by ${Math.round((total - target) * 100) / 100}%. Reduce a goal weightage.`
          : `${Math.round((target - total) * 100) / 100}% remaining.`}
        {hint && <span className="ml-1 text-slate-400">{hint}</span>}
      </div>
    </div>
  );
}
