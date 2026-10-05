import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';

// Material hierarchy from CLAUDE.md: filled (the one primary action),
// outlined (secondary: Cancel, Return), text (low emphasis: View).
export const buttonVariants = cva(
    'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                filled: 'bg-dost-blue text-white hover:bg-dost-blue-deep',
                outlined:
                    'border border-dost-blue bg-transparent text-dost-blue hover:border-dost-blue-deep hover:text-dost-blue-deep',
                'outlined-rust':
                    'border border-stamp-rust bg-transparent text-stamp-rust hover:bg-stamp-rust-bg',
                text: 'h-auto px-2 py-1 text-dost-blue hover:text-dost-blue-deep',
            },
        },
        defaultVariants: {
            variant: 'filled',
        },
    },
);

export const Button = forwardRef(function Button(
    { className, variant, type = 'button', ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            className={cn(buttonVariants({ variant }), className)}
            {...props}
        />
    );
});
