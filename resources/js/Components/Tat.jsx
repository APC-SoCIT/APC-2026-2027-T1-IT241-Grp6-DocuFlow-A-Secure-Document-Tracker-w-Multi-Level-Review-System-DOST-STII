import { cn } from '@/lib/utils';

/**
 * TAT in calendar days, "(final)" once the document left the reviewer, and
 * a stamp-rust "Overdue" marker after more than 5 days.
 */
export default function Tat({ days, isFinal, isOverdue, className }) {
    if (days === null || days === undefined) {
        return '—';
    }

    return (
        <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
            {days} {days === 1 ? 'day' : 'days'}
            {isFinal && <span className="font-normal text-ink-muted">(final)</span>}
            {isOverdue && (
                <span className="rounded-full bg-stamp-rust-bg px-2.5 py-0.5 text-xs font-medium text-stamp-rust">
                    Overdue
                </span>
            )}
        </span>
    );
}
