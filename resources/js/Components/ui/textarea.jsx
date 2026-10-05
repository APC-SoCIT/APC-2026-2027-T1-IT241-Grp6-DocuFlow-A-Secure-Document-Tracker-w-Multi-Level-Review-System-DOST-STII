import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
    return (
        <textarea
            ref={ref}
            className={cn(
                'block min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-dost-blue focus:outline-hidden focus:ring-1 focus:ring-dost-blue disabled:opacity-50 aria-invalid:border-stamp-rust',
                className,
            )}
            {...props}
        />
    );
});
