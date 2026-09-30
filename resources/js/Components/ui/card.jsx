import { cn } from '@/lib/utils';

// White on paper: elevation comes from the tonal step, not a shadow.
export function Card({ className, ...props }) {
    return (
        <div
            className={cn('rounded-lg border border-border bg-white', className)}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }) {
    return <div className={cn('px-6 pt-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
    return <h2 className={cn('text-base font-medium text-ink', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
    return <div className={cn('p-6', className)} {...props} />;
}
