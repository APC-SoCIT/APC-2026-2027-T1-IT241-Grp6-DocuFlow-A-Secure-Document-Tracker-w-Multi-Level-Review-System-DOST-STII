import { cn } from '@/lib/utils';

// Stamp colors per CLAUDE.md, labels in sentence case.
const STATUSES = {
    pending_l1_review: { label: 'Pending L1 review', className: 'bg-stamp-amber-bg text-stamp-amber' },
    pending_l2_review: { label: 'Pending L2 review', className: 'bg-stamp-amber-bg text-stamp-amber' },
    pending_l3_review: { label: 'Pending L3 review', className: 'bg-stamp-amber-bg text-stamp-amber' },
    returned_to_source: { label: 'Returned to source', className: 'bg-stamp-rust-bg text-stamp-rust' },
    approved_complete: { label: 'Approved - complete', className: 'bg-stamp-green-bg text-stamp-green' },
};

export default function StatusBadge({ status, className }) {
    const { label, className: colors } = STATUSES[status] ?? {
        label: status,
        className: 'bg-paper-dim text-ink-muted',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium',
                colors,
                className,
            )}
        >
            {label}
        </span>
    );
}
