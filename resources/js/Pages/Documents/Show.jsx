import StatusBadge from '@/Components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

function formatDateTime(value) {
    return new Date(value).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function Detail({ label, children }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-right text-sm font-medium text-ink">{children}</dd>
        </div>
    );
}

export default function Show({ document }) {
    return (
        <AuthenticatedLayout
            header={
                <h1 className="text-2xl font-medium text-ink">{document.reference_number}</h1>
            }
        >
            <Head title={document.reference_number} />

            <div className="grid gap-6 px-8 py-6 lg:grid-cols-5">
                {/* Left, ~60%: document preview (built in Task 6.1). */}
                <Card className="flex min-h-[480px] items-center justify-center lg:col-span-3">
                    <div className="text-center text-ink-muted">
                        <span aria-hidden="true" className="material-symbols-outlined text-[40px]">
                            description
                        </span>
                        <p className="mt-2 text-sm">Document preview is added in Task 6.1.</p>
                    </div>
                </Card>

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
                                <Detail label="Submitted">{formatDateTime(document.submitted_at)}</Detail>
                                <Detail label="Status">
                                    <StatusBadge status={document.status} />
                                </Detail>
                            </dl>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
