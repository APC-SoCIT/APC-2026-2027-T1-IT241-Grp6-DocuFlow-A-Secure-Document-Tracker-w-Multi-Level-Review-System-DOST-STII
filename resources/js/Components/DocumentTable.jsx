import StatusBadge from '@/Components/StatusBadge';
import { buttonVariants } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { formatDateTime } from '@/lib/format';
import { Link } from '@inertiajs/react';

const COLUMNS = ['Reference number', 'Document type', 'Submitted by', 'Date Submitted', 'Status', ''];

/**
 * Plain document list in a card: no search, filters or summary (CLAUDE.md).
 */
export default function DocumentTable({ documents, emptyMessage }) {
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
                                        {document.document_type}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink">
                                        {document.submitted_by}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink">
                                        {formatDateTime(document.submitted_at)}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3">
                                        <StatusBadge status={document.status} />
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
