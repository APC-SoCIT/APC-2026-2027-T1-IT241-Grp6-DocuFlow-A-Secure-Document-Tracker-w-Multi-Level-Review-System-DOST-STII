import { cn } from '@/lib/utils';

/**
 * One section of a long form: title and short help on the left, the fields
 * on the right (stacked on small screens).
 */
export default function FormSection({ title, description, children, className }) {
    return (
        <section className={cn('grid gap-4 px-5 py-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8', className)}>
            <div>
                <h2 className="text-sm font-semibold">{title}</h2>
                {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
            </div>
            <div className="grid min-w-0 gap-5">{children}</div>
        </section>
    );
}
