import DashboardSummary from '@/Components/DashboardSummary';
import DocumentFilters from '@/Components/DocumentFilters';
import DocumentTable from '@/Components/DocumentTable';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';

export default function Index({ documents, filters, statusOptions, canFilterByRole, dashboard }) {
    const { auth } = usePage().props;
    const filtering = Object.keys(filters).length > 0;

    return (
        <AuthenticatedLayout title="My documents">
            <Head title="My documents" />

            <div className="space-y-6">
                <DocumentFilters
                    filters={filters}
                    statusOptions={statusOptions}
                    canFilterByRole={canFilterByRole}
                />

                <DashboardSummary dashboard={dashboard} />

                <DocumentTable
                    documents={documents}
                    emptyMessage={
                        filtering
                            ? 'No records found'
                            : auth.user.role === 'document_source'
                              ? "You haven't submitted any documents yet."
                              : 'No documents have been submitted by you or assigned to you yet.'
                    }
                />
            </div>
        </AuthenticatedLayout>
    );
}
