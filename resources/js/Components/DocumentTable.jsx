import ReviewState from '@/Components/ReviewState';
import StatusBadge from '@/Components/StatusBadge';
import Tat from '@/Components/Tat';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatDateTime } from '@/lib/format';
import { Link } from '@inertiajs/react';

const COLUMNS = ['Reference number', 'Date Submitted', 'Status', 'Review level', 'Assigned reviewer', 'TAT'];

/**
 * Document list in a card. Columns per CLAUDE.md: reference number, Date
 * Submitted, status, review level, assigned reviewer, TAT with the Overdue
 * marker, plus View to open the document.
 */
export default function DocumentTable({ documents, emptyMessage, showReviewState = false }) {
    return (
        <Card className="py-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        {COLUMNS.map((column, i) => (
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
                    {documents.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={COLUMNS.length + 1}
                                className="h-32 text-center text-muted-foreground"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        documents.map((document) => (
                            <TableRow key={document.id}>
                                <TableCell className="pl-4 font-medium">{document.reference_number}</TableCell>
                                <TableCell>{formatDateTime(document.submitted_at)}</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center gap-2">
                                        <StatusBadge status={document.status} />
                                        {showReviewState && <ReviewState state={document.review_state} />}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {document.review_level ? `Level ${document.review_level}` : '—'}
                                </TableCell>
                                <TableCell>{document.assigned_reviewer ?? '—'}</TableCell>
                                <TableCell>
                                    <Tat
                                        days={document.tat_days}
                                        isFinal={document.tat_is_final}
                                        isOverdue={document.is_overdue}
                                    />
                                </TableCell>
                                <TableCell className="pr-4 text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={route('documents.show', document.id)}>View</Link>
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
