import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';
import { CircleCheckIcon, ClockIcon, Undo2Icon } from 'lucide-react';

// Labels use the use case documents' exact wording. Colors (app.css custom
// section) and icons keep pending, returned and approved easy to tell apart.
const PENDING = { className: 'bg-status-pending-bg text-status-pending', icon: ClockIcon };

const STATUSES = {
    pending_l1_review: { label: 'Pending Level 1 Review', ...PENDING },
    pending_l2_review: { label: 'Pending Level 2 Review', ...PENDING },
    pending_l3_review: { label: 'Pending Level 3 Review', ...PENDING },
    returned_to_source: {
        label: 'Returned to Source',
        className: 'bg-status-returned-bg text-status-returned',
        icon: Undo2Icon,
    },
    approved_complete: {
        label: 'Approved - Complete',
        className: 'bg-status-approved-bg text-status-approved',
        icon: CircleCheckIcon,
    },
};

export default function StatusBadge({ status, className }) {
    const config = STATUSES[status];

    if (!config) {
        return (
            <Badge variant="secondary" className={className}>
                {status}
            </Badge>
        );
    }

    const Icon = config.icon;

    return (
        <Badge className={cn(config.className, className)}>
            <Icon data-icon="inline-start" aria-hidden="true" />
            {config.label}
        </Badge>
    );
}
