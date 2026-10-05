import HistoryDialog from '@/Components/HistoryDialog';
import { Button } from '@/Components/ui/button';
import { Card, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
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
        <Card className="pb-0">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column, i) => (
                            <TableHead key={column} className={i === 0 ? 'pl-4' : undefined}>
                                {column}
                            </TableHead>
                        ))}
                        <TableHead className="pr-4">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length + 1} className="h-24 text-center text-muted-foreground">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => (
                            <TableRow key={row.key}>
                                {row.cells.map((cell, i) => (
                                    <TableCell key={i} className={i === 0 ? 'max-w-xs truncate pl-4' : 'max-w-xs truncate'}>
                                        {cell ?? '—'}
                                    </TableCell>
                                ))}
                                <TableCell className="pr-4 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onView(row)}>
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}

/**
 * Revision history and review remarks history (read-only). View opens the
 * full record in a dialog.
 */
export default function DocumentHistory({ revisions, reviews }) {
    // The last opened record stays set while the dialog animates closed.
    const [dialog, setDialog] = useState(null); // { title, rows }
    const [dialogOpen, setDialogOpen] = useState(false);
    const view = (row) => {
        setDialog(row.dialog);
        setDialogOpen(true);
    };

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
                onView={view}
            />
            <HistoryTable
                title="Review remarks history"
                columns={['Revision', 'Review level', 'Reviewer', 'Action', 'Date']}
                rows={reviewRows}
                emptyMessage="No reviews yet."
                onView={view}
            />

            <HistoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title={dialog?.title}
                rows={dialog?.rows ?? []}
            />
        </div>
    );
}
