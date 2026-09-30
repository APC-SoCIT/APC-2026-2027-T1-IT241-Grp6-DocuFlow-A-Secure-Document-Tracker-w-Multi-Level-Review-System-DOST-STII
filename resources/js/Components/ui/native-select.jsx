import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import { controlClass } from './input';

export const NativeSelect = forwardRef(function NativeSelect(
    { className, ...props },
    ref,
) {
    return <select ref={ref} className={cn(controlClass, 'pr-10', className)} {...props} />;
});
