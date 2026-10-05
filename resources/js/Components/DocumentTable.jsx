import ReviewState from '@/Components/ReviewState';
import StatusBadge from '@/Components/StatusBadge';
import Tat from '@/Components/Tat';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatDate, formatTime } from '@/lib/format';
import { Link, router } from '@inertiajs/react';
import { FileSearchIcon } from 'lucide-react';

const COLUMNS = [
    'Reference number',
    'Document Type',
    'Date Submitted',
    'Status',
    'Review level',
    'Assigned reviewer',
    'TAT',
];

/**
 * Document list in a card. Columns per CLAUDE.md. A row opens the document;
 * the reference number is also a link, so keyboard users can tab to it.
 */
export default function DocumentTable({ documents, emptyMessage, showReviewState = false }) {
    return (
        <Card className="gap-0 py-0">
            <Table className="text-[13px]">
                <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                        {COLUMNS.map((column, i) => (
                            <TableHead
                                key={column}
                                className={
                                    'h-9 text-xs font-medium text-muted-foreground' +
                                    (i === 0 ? ' pl-4' : '') +
                                    (i === COLUMNS.length - 1 ? ' pr-4' : '')
                                }
                            >
                                {column}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={COLUMNS.length} className="h-40 text-center">
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <FileSearchIcon aria-hidden="true" className="size-6" />
                                    <span>{emptyMessage}</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        documents.map((document) => {
                            const href = route('documents.show', document.id);

                            return (
                                <TableRow
                                    key={document.id}
                                    onClick={(e) => {
                                        // Let the link handle its own clicks (and ctrl/middle-click).
                                        if (!e.target.closest('a')) router.visit(href);
                                    }}
                                    className="group cursor-pointer"
                                >
                                    <TableCell className="py-2.5 pl-4">
                                        <Link
                                            href={href}
                                            className="font-medium underline-offset-4 group-hover:underline focus-visible:underline focus-visible:outline-none"
                                        >
                                            {document.reference_number}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{document.document_type}</TableCell>
                                    <TableCell className="leading-tight">
                                        <span className="block tabular-nums">{formatDate(document.submitted_at)}</span>
                                        <span className="block text-xs text-muted-foreground tabular-nums">
                                            {formatTime(document.submitted_at)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1.5">
                                            <StatusBadge status={document.status} />
                                            {showReviewState && <ReviewState state={document.review_state} />}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {document.review_level ? `Level ${document.review_level}` : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {document.assigned_reviewer ?? <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="pr-4">
                                        <Tat
                                            className="flex-nowrap whitespace-nowrap"
                                            days={document.tat_days}
                                            isFinal={document.tat_is_final}
                                            isOverdue={document.is_overdue}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}
