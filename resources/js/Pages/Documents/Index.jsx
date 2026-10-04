import DocumentTable from '@/Components/DocumentTable';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';

export default function Index({ documents }) {
    const { auth } = usePage().props;

    return (
        <AuthenticatedLayout
            header={<h1 className="text-2xl font-medium text-ink">My documents</h1>}
        >
            <Head title="My documents" />

            <div className="px-8 py-6">
                <DocumentTable
                    documents={documents}
                    emptyMessage={
                        auth.user.role === 'document_source'
                            ? "You haven't submitted any documents yet."
                            : 'No documents have been submitted by you or assigned to you yet.'
                    }
                />
            </div>
        </AuthenticatedLayout>
    );
}
