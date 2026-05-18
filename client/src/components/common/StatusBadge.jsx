import { cn } from '../../lib/utils';

const LABEL = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rework: 'Rework',
  locked: 'Locked',
  shared: 'Shared'
};

export default function StatusBadge({ status, locked, shared, className }) {
  if (shared) return <span className={cn('badge-shared', className)}>{LABEL.shared}</span>;
  return (
    <span className={cn(
      status === 'draft'     && 'badge-draft',
      status === 'submitted' && 'badge-submitted',
      status === 'approved'  && 'badge-approved',
      status === 'rework'    && 'badge-rework',
      className
    )}>
      {LABEL[status] || status}
      {locked && status === 'approved' ? '' : ''}
    </span>
  );
}

export function LockedBadge({ className }) {
  return <span className={cn('badge-locked', className)}>{LABEL.locked}</span>;
}
