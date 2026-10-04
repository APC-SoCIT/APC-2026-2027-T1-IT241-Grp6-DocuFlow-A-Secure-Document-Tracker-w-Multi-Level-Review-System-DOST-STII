import { cn } from '@/lib/utils';

// Stamp colors per CLAUDE.md; labels use the use case documents' exact wording.
const STATUSES = {
    pending_l1_review: { label: 'Pending Level 1 Review', className: 'bg-stamp-amber-bg text-stamp-amber' },
    pending_l2_review: { label: 'Pending Level 2 Review', className: 'bg-stamp-amber-bg text-stamp-amber' },
    pending_l3_review: { label: 'Pending Level 3 Review', className: 'bg-stamp-amber-bg text-stamp-amber' },
    returned_to_source: { label: 'Returned to Source', className: 'bg-stamp-rust-bg text-stamp-rust' },
    approved_complete: { label: 'Approved - Complete', className: 'bg-stamp-green-bg text-stamp-green' },
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
