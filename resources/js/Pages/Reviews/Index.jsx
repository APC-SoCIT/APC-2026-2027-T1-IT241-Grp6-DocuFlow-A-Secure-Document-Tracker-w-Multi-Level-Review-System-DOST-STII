import DocumentTable from '@/Components/DocumentTable';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Index({ documents }) {
    return (
        <AuthenticatedLayout
            header={<h1 className="text-2xl font-medium text-ink">Review queue</h1>}
        >
            <Head title="Review queue" />

            <div className="px-8 py-6">
                <DocumentTable
                    documents={documents}
                    emptyMessage="No documents are waiting for your review."
                />
            </div>
        </AuthenticatedLayout>
    );
}
