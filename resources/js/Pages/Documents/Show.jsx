import DocumentHistory from '@/Components/DocumentHistory';
import DocumentPreview from '@/Components/DocumentPreview';
import ReturnNotice from '@/Components/ReturnNotice';
import ReviewPanel from '@/Components/ReviewPanel';
import ReviewState from '@/Components/ReviewState';
import StatusBadge from '@/Components/StatusBadge';
import Tat from '@/Components/Tat';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';

function Detail({ label, children }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{children}</dd>
        </div>
    );
}

export default function Show({ document, revisions, reviews, lastReturn, canResubmit, preview, review }) {
    return (
        <AuthenticatedLayout title={document.reference_number}>
            <Head title={document.reference_number} />

            <div className="space-y-6">
                {/* Returned to Source: the latest return remarks come first. */}
                {lastReturn && (
                    <ReturnNotice
                        lastReturn={lastReturn}
                        action={
                            canResubmit && (
                                <Button asChild>
                                    <Link href={route('documents.resubmit.edit', document.id)}>Resubmit</Link>
                                </Button>
                            )
                        }
                    />
                )}

                <div className="grid gap-6 lg:grid-cols-5">
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
                            <CardContent>
                                <dl className="divide-y">
                                    <Detail label="Reference number">{document.reference_number}</Detail>
                                    <Detail label="Document type">{document.document_type}</Detail>
                                    <Detail label="Submitted by">{document.submitted_by}</Detail>
                                    <Detail label="Date Submitted">{formatDateTime(document.submitted_at)}</Detail>
                                    <Detail label="Revision">{document.revision_number}</Detail>
                                    <Detail label="Status">
                                        <StatusBadge status={document.status} />
                                    </Detail>
                                    {document.review_state && (
                                        <Detail label="Review state">
                                            <ReviewState state={document.review_state} />
                                        </Detail>
                                    )}
                                    <Detail label="Review level">
                                        {document.review_level ? `Level ${document.review_level}` : '—'}
                                    </Detail>
                                    <Detail label="Assigned reviewer">{document.assigned_reviewer ?? '—'}</Detail>
                                    <Detail label="TAT">
                                        <Tat
                                            className="justify-end"
                                            days={document.tat_days}
                                            isFinal={document.tat_is_final}
                                            isOverdue={document.is_overdue}
                                        />
                                    </Detail>
                                </dl>
                            </CardContent>
                        </Card>

                        {review && <ReviewPanel documentId={document.id} review={review} />}
                    </div>
                </div>

                <DocumentHistory revisions={revisions} reviews={reviews} />
            </div>
        </AuthenticatedLayout>
    );
}
