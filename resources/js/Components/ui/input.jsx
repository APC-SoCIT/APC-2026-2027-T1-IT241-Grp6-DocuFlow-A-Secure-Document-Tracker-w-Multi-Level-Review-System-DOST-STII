import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

// Shared by inputs and native selects so every form control matches.
export const controlClass =
    'block h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-ink placeholder:text-ink-muted focus:border-dost-blue focus:outline-hidden focus:ring-1 focus:ring-dost-blue disabled:opacity-50 aria-invalid:border-stamp-rust';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClass, className)} {...props} />;
});
