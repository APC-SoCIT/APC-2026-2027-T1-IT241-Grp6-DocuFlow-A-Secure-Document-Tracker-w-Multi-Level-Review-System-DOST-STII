import ReviewState from '@/Components/ReviewState';
import StatusBadge from '@/Components/StatusBadge';
import Tat from '@/Components/Tat';
import { buttonVariants } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { formatDateTime } from '@/lib/format';
import { Link } from '@inertiajs/react';

const COLUMNS = ['Reference number', 'Date Submitted', 'Status', 'Review level', 'Assigned reviewer', 'TAT', ''];

/**
 * Document list in a card. Columns per CLAUDE.md: reference number, Date
 * Submitted, status, review level, assigned reviewer, TAT with the Overdue
 * marker, plus View to open the document.
 */
export default function DocumentTable({ documents, emptyMessage, showReviewState = false }) {
    return (
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-border">
                        <tr>
                            {COLUMNS.map((column) => (
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
                        {documents.length === 0 ? (
                            <tr>
                                <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-ink-muted">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            documents.map((document) => (
                                <tr key={document.id} className="transition-colors hover:bg-paper">
                                    <td className="whitespace-nowrap px-6 py-3 font-medium text-ink">
                                        {document.reference_number}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink">
                                        {formatDateTime(document.submitted_at)}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3">
                                        <span className="inline-flex items-center gap-2">
                                            <StatusBadge status={document.status} />
                                            {showReviewState && <ReviewState state={document.review_state} />}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink">
                                        {document.review_level ? `Level ${document.review_level}` : '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink">
                                        {document.assigned_reviewer ?? '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink">
                                        <Tat
                                            days={document.tat_days}
                                            isFinal={document.tat_is_final}
                                            isOverdue={document.is_overdue}
                                        />
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-right">
                                        <Link
                                            href={route('documents.show', document.id)}
                                            className={buttonVariants({ variant: 'text' })}
                                        >
                                            View
                                        </Link>
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
