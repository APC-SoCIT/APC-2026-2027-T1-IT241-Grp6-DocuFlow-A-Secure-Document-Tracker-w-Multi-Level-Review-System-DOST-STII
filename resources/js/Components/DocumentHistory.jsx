import HistoryDialog from '@/Components/HistoryDialog';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardHeader, CardTitle } from '@/Components/ui/card';
import { formatDateTime } from '@/lib/format';
import { useState } from 'react';

const ACTION_LABELS = {
    return: 'Returned',
    forward: 'Forwarded',
    endorse: 'Endorsed',
    approve: 'Approved',
};

function days(n) {
    return n === null || n === undefined ? null : `${n} ${n === 1 ? 'day' : 'days'}`;
}

function HistoryTable({ title, columns, rows, emptyMessage, onView }) {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-y border-border">
                        <tr>
                            {[...columns, ''].map((column) => (
                                <th
                                    key={column}
                                    scope="col"
                                    className="whitespace-nowrap px-6 py-3 font-medium text-ink-muted"
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-ink-muted">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.key} className="transition-colors hover:bg-paper">
                                    {row.cells.map((cell, i) => (
                                        <td key={i} className="max-w-xs truncate whitespace-nowrap px-6 py-3 text-ink">
                                            {cell ?? '—'}
                                        </td>
                                    ))}
                                    <td className="whitespace-nowrap px-6 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => onView(row)}
                                            className={buttonVariants({ variant: 'text' })}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

/**
 * Revision history and review remarks history (read-only). View opens the
 * full record in a dialog.
 */
export default function DocumentHistory({ revisions, reviews }) {
    const [open, setOpen] = useState(null); // { title, rows } or null

    const revisionRows = revisions.map((r) => ({
        key: r.id,
        cells: [
            `Revision ${r.revision_number}`,
            formatDateTime(r.submitted_at),
            r.submitted_by,
            r.change_note ?? (r.revision_number === 1 ? 'First submission' : null),
        ],
        dialog: {
            title: `Revision ${r.revision_number}`,
            rows: [
                ['Revision', r.revision_number],
                [r.revision_number === 1 ? 'Date Submitted' : 'Resubmitted', formatDateTime(r.submitted_at)],
                [r.revision_number === 1 ? 'Submitted by' : 'Resubmitted by', r.submitted_by],
                ['Change note', r.change_note ?? (r.revision_number === 1 ? 'First submission' : null)],
            ],
        },
    }));

    const reviewRows = reviews.map((r) => ({
        key: r.id,
        cells: [
            `Revision ${r.revision_number}`,
            `Level ${r.review_level}`,
            r.reviewer,
            ACTION_LABELS[r.action] ?? r.action,
            formatDateTime(r.reviewed_at),
        ],
        dialog: {
            title: `Level ${r.review_level} review: ${ACTION_LABELS[r.action] ?? r.action}`,
            rows: [
                ['Revision', r.revision_number],
                ['Review level', `Level ${r.review_level}`],
                ['Reviewer', r.reviewer],
                ['Action', ACTION_LABELS[r.action] ?? r.action],
                ['Date', formatDateTime(r.reviewed_at)],
                ['TAT', days(r.tat_days)],
                ['Rating', r.rating],
                ['Assessment', r.assessment],
                ['Remarks', r.remarks],
            ],
        },
    }));

    return (
        <div className="space-y-6">
            <HistoryTable
                title="Revision history"
                columns={['Revision', 'Date', 'Submitted by', 'Change note']}
                rows={revisionRows}
                emptyMessage="No revisions yet."
                onView={(row) => setOpen(row.dialog)}
            />
            <HistoryTable
                title="Review remarks history"
                columns={['Revision', 'Review level', 'Reviewer', 'Action', 'Date']}
                rows={reviewRows}
                emptyMessage="No reviews yet."
                onView={(row) => setOpen(row.dialog)}
            />

            <HistoryDialog title={open?.title} rows={open?.rows ?? null} onClose={() => setOpen(null)} />
        </div>
    );
}
