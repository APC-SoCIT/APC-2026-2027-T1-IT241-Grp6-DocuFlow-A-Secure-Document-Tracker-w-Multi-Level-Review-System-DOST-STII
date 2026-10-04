import { Button } from '@/Components/ui/button';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';

/**
 * Read-only details of one revision or review record. No edit or delete:
 * completed reviews and revisions can't be changed.
 */
export default function HistoryDialog({ title, rows, onClose }) {
    return (
        <Dialog open={rows !== null} onClose={onClose} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 bg-ink/40" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                        <DialogTitle className="text-base font-medium text-ink">{title}</DialogTitle>
                        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                            Read-only
                        </span>
                    </div>

                    <dl className="mt-4 divide-y divide-border">
                        {(rows ?? []).map(([label, value]) => (
                            <div key={label} className="py-2.5">
                                <dt className="text-sm text-ink-muted">{label}</dt>
                                <dd className="mt-0.5 whitespace-pre-line text-sm text-ink">
                                    {value === null || value === undefined || value === '' ? '—' : value}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    <div className="mt-6 flex justify-end">
                        <Button variant="outlined" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
