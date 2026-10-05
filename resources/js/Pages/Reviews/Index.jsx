import DocumentTable from '@/Components/DocumentTable';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Index({ documents }) {
    return (
        <AuthenticatedLayout title="Review queue">
            <Head title="Review queue" />

            <DocumentTable
                documents={documents}
                showReviewState
                emptyMessage="No documents are waiting for your review."
            />
        </AuthenticatedLayout>
    );
}
