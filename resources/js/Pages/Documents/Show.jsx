import DocumentPreview from '@/Components/DocumentPreview';
import ReviewPanel from '@/Components/ReviewPanel';
import StatusBadge from '@/Components/StatusBadge';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';

function Detail({ label, children }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-right text-sm font-medium text-ink">{children}</dd>
        </div>
    );
}

export default function Show({ document, lastReturn, canResubmit, preview, review }) {
    return (
        <AuthenticatedLayout
            header={
                <h1 className="text-2xl font-medium text-ink">{document.reference_number}</h1>
            }
        >
            <Head title={document.reference_number} />

            <div className="grid gap-6 px-8 py-6 lg:grid-cols-5">
                {/* Left, ~60%: document preview. */}
                <div className="lg:col-span-3">
                    <DocumentPreview preview={preview} title={document.reference_number} />
                </div>

                {/* Right, ~40%: stacked cards. */}
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Document details</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <dl className="divide-y divide-border">
                                <Detail label="Reference number">{document.reference_number}</Detail>
                                <Detail label="Document type">{document.document_type}</Detail>
                                <Detail label="Submitted by">{document.submitted_by}</Detail>
                                <Detail label="Date Submitted">{formatDateTime(document.submitted_at)}</Detail>
                                <Detail label="Revision">{document.revision_number}</Detail>
                                <Detail label="Status">
                                    <StatusBadge status={document.status} />
                                </Detail>
                            </dl>
                        </CardContent>
                    </Card>

                    {lastReturn && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Returned by {lastReturn.reviewer}</CardTitle>
                                <p className="mt-1 text-sm text-ink-muted">
                                    Level {lastReturn.review_level} ·{' '}
                                    {formatDateTime(lastReturn.returned_at)}
                                </p>
                            </CardHeader>
                            <CardContent className="pt-3">
                                <p className="whitespace-pre-line text-sm text-ink">
                                    {lastReturn.remarks || 'No remarks were given.'}
                                </p>

                                {canResubmit && (
                                    <div className="mt-6 flex justify-end">
                                        <Link
                                            href={route('documents.resubmit.edit', document.id)}
                                            className={buttonVariants({ variant: 'filled' })}
                                        >
                                            Resubmit
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {review && <ReviewPanel documentId={document.id} review={review} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
