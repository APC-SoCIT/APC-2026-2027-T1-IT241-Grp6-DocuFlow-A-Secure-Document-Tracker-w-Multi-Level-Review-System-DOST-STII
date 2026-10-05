import DocumentHistory from '@/Components/DocumentHistory';
import DocumentPreview from '@/Components/DocumentPreview';
import ReturnNotice from '@/Components/ReturnNotice';
import ReviewPanel, { ReviewActions, useReview } from '@/Components/ReviewPanel';
import ReviewState from '@/Components/ReviewState';
import StatusBadge from '@/Components/StatusBadge';
import Tat from '@/Components/Tat';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';

function Detail({ label, children, wide = false }) {
    return (
        <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-medium">{children}</dd>
        </div>
    );
}

// The attached Google Workspace link or uploaded file, as a link to open it.
function Attachment({ preview, reference }) {
    if (preview.kind === 'missing') {
        return <span className="text-muted-foreground">The uploaded file is unavailable</span>;
    }

    const isLink = preview.kind === 'google';

    return (
        <a
            href={preview.open_url}
            target={preview.kind === 'file' ? undefined : '_blank'}
            rel="noreferrer"
            className="block truncate underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
        >
            {isLink ? preview.open_url : `${reference}.${preview.extension}`}
        </a>
    );
}

export default function Show({ document, revisions, reviews, lastReturn, canResubmit, preview, review }) {
    const title = document.reference_number;
    const reviewController = useReview(document.id, review);

    return (
        <AuthenticatedLayout
            title={title}
            back={{ fallback: route(review ? 'reviews.index' : 'documents.index') }}
            actions={
                review ? (
                    <ReviewActions controller={reviewController} />
                ) : (
                    canResubmit && (
                        <Button asChild>
                            <Link href={route('documents.resubmit.edit', document.id)}>Resubmit</Link>
                        </Button>
                    )
                )
            }
        >
            <Head title={title} />

            <div className="grid gap-5 lg:grid-cols-12">
                {/* Left, ~60%: the document. Stays in view below the fixed headers. */}
                <div className="h-[70svh] lg:sticky lg:top-[8.25rem] lg:col-span-7 lg:h-[calc(100svh-9.5rem)]">
                    <DocumentPreview preview={preview} title={title} />
                </div>

                {/* Right, ~40%: details, the review, then the history. */}
                <div className="space-y-4 lg:col-span-5">
                    {/* Returned to Source: the latest return remarks come first. */}
                    {lastReturn && <ReturnNotice lastReturn={lastReturn} />}

                    <Card className="gap-3">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">Document details</CardTitle>
                        </CardHeader>
                        <CardContent className="text-[13px]">
                            {document.description && (
                                <p className="mb-4 whitespace-pre-line text-foreground/90">{document.description}</p>
                            )}
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                                <Detail label="Reference number">{document.reference_number}</Detail>
                                <Detail label="Document type">{document.document_type}</Detail>
                                <Detail label="Submitted by">{document.submitted_by}</Detail>
                                <Detail label="Date Submitted">{formatDateTime(document.submitted_at)}</Detail>
                                <Detail label={preview.kind === 'google' ? 'Google Workspace link' : 'Attached file'} wide>
                                    <Attachment preview={preview} reference={document.reference_number} />
                                </Detail>
                                <Detail label="Status">
                                    <StatusBadge status={document.status} />
                                </Detail>
                                <Detail label="Revision">{document.revision_number}</Detail>
                                <Detail label="Review level">
                                    {document.review_level ? `Level ${document.review_level}` : '—'}
                                </Detail>
                                <Detail label="Assigned reviewer">{document.assigned_reviewer ?? '—'}</Detail>
                                {document.review_state && (
                                    <Detail label="Review state">
                                        <ReviewState state={document.review_state} />
                                    </Detail>
                                )}
                                <Detail label="TAT">
                                    <Tat
                                        days={document.tat_days}
                                        isFinal={document.tat_is_final}
                                        isOverdue={document.is_overdue}
                                    />
                                </Detail>
                            </dl>
                        </CardContent>
                    </Card>

                    {review && <ReviewPanel controller={reviewController} />}

                    <DocumentHistory revisions={revisions} reviews={reviews} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
