import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';
import { TriangleAlertIcon } from 'lucide-react';

/**
 * TAT in calendar days, "(final)" once the document left the reviewer, and
 * a rust "Overdue" marker after more than 5 days.
 */
export default function Tat({ days, isFinal, isOverdue, className }) {
    if (days === null || days === undefined) {
        return '—';
    }

    return (
        <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
            {days} {days === 1 ? 'day' : 'days'}
            {isFinal && <span className="text-muted-foreground">(final)</span>}
            {isOverdue && (
                <Badge className="bg-status-returned-bg text-status-returned">
                    <TriangleAlertIcon data-icon="inline-start" aria-hidden="true" />
                    Overdue
                </Badge>
            )}
        </span>
    );
}
