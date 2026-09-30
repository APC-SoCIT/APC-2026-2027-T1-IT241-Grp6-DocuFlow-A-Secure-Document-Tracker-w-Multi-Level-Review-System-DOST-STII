import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui class-name helper: merges conditional classes and resolves
// conflicting Tailwind utilities (last one wins).
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
