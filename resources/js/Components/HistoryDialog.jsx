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

/**
 * Read-only details of one revision or review record. No edit or delete:
 * completed reviews and revisions can't be changed.
 */
export default function HistoryDialog({ open, onOpenChange, title, rows }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle>{title}</DialogTitle>
                        <Badge variant="outline">Read-only</Badge>
                    </div>
                    <DialogDescription>Completed records can't be edited or deleted.</DialogDescription>
                </DialogHeader>

                <dl className="divide-y">
                    {rows.map(([label, value]) => (
                        <div key={label} className="py-2.5">
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="mt-0.5 whitespace-pre-line">
                                {value === null || value === undefined || value === '' ? '—' : value}
                            </dd>
                        </div>
                    ))}
                </dl>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
