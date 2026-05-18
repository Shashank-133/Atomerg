import { scoreColor } from '../../lib/utils';
import { cn } from '../../lib/utils';

export default function ProgressBar({ score, height = 'h-2', showLabel = false }) {
  const pct = score === null || score === undefined ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div className="w-full">
      <div className={cn('w-full rounded-full bg-slate-200 overflow-hidden', height)}>
        <div
          className={cn('h-full transition-all duration-500', scoreColor(score))}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-slate-500 tabular-nums">
          {score === null || score === undefined ? 'Not started' : `${Math.round(score)}%`}
        </div>
      )}
    </div>
  );
}
