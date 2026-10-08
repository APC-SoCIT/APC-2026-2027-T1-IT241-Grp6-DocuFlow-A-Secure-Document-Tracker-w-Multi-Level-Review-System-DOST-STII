import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

function isEmpty(value) {
    return value === null || value === undefined || value === '';
}

// The last fact fills the rest of its row, so the grid never shows an empty cell.
function lastFactClassName(count) {
    return cn(
        count % 2 === 1 && 'col-span-2',
        { 0: 'sm:col-span-1', 1: 'sm:col-span-3', 2: 'sm:col-span-2' }[count % 3],
    );
}

/**
 * Read-only details of one revision or review record. No edit or delete:
 * completed reviews and revisions can't be changed.
 *
 * record: { title, subtitle, facts: [[label, value]], notes: [[label, text]] }
 */
export default function HistoryDialog({ open, onOpenChange, record }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
                <DialogHeader className="border-b px-5 py-4 pr-12">
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <DialogTitle className="text-base font-semibold">{record?.title}</DialogTitle>
                            <Badge variant="outline" className="text-muted-foreground">
                                Read-only
                            </Badge>
                        </div>
                        <DialogDescription className="text-[13px]">{record?.subtitle}</DialogDescription>
                    </div>
                </DialogHeader>

                <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
                    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border sm:grid-cols-3">
                        {(record?.facts ?? []).map(([label, value], i, facts) => (
                            <div
                                key={label}
                                className={cn(
                                    'bg-background px-3 py-2.5',
                                    i === facts.length - 1 && lastFactClassName(facts.length),
                                )}
                            >
                                <dt className="text-xs text-muted-foreground">{label}</dt>
                                <dd className="mt-0.5 truncate text-[13px] font-medium">{isEmpty(value) ? '—' : value}</dd>
                            </div>
                        ))}
                    </dl>

                    {(record?.notes ?? []).map(([label, text]) => (
                        <section key={label}>
                            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</h3>
                            {isEmpty(text) ? (
                                <p className="text-[13px] text-muted-foreground">Not given.</p>
                            ) : (
                                <p className="rounded-lg bg-muted/60 px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-line">
                                    {text}
                                </p>
                            )}
                        </section>
                    ))}
                </div>

                <DialogFooter className="mx-0 mb-0">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
