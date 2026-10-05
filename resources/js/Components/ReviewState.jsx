import { Badge } from '@/Components/ui/badge';

// Story #27: New = assigned, not opened yet; Ongoing = opened, no action yet.
// Both stay neutral so they don't compete with the status badge.
const STATES = {
    new: { label: 'New', variant: 'outline' },
    ongoing: { label: 'Ongoing', variant: 'secondary' },
};

export default function ReviewState({ state, className }) {
    const config = STATES[state];
    if (!config) {
        return null;
    }

    return (
        <Badge variant={config.variant} className={className}>
            {config.label}
        </Badge>
    );
}
