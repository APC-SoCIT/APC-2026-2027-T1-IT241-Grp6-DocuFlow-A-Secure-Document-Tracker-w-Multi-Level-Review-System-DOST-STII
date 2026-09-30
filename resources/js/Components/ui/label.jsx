import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const Label = forwardRef(function Label({ className, ...props }, ref) {
    return (
        <label
            ref={ref}
            className={cn('mb-1.5 block text-sm font-medium text-ink', className)}
            {...props}
        />
    );
});
