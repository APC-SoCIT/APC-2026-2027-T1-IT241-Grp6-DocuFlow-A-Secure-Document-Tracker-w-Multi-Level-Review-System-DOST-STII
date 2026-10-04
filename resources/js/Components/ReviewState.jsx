import { cn } from '@/lib/utils';

// Story #27: New = assigned, not opened yet; Ongoing = opened, no action yet.
const STATES = {
    new: { label: 'New', className: 'border-dost-blue text-dost-blue' },
    ongoing: { label: 'Ongoing', className: 'border-border text-ink-muted' },
};

export default function ReviewState({ state, className }) {
    const config = STATES[state];
    if (!config) {
        return null;
    }

    return (
        <span
            className={cn(
                'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
                config.className,
                className,
            )}
        >
            {config.label}
        </span>
    );
}
