import DocumentTable from '@/Components/DocumentTable';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Index({ documents }) {
    return (
        <AuthenticatedLayout
            header={<h1 className="text-2xl font-medium text-ink">My documents</h1>}
        >
            <Head title="My documents" />

            <div className="px-8 py-6">
                <DocumentTable
                    documents={documents}
                    emptyMessage="You haven't submitted any documents yet."
                />
            </div>
        </AuthenticatedLayout>
    );
}
