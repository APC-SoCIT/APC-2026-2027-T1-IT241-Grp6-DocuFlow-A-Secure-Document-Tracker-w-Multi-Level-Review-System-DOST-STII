import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

// Stand-in for screens built in later tasks, so the sidebar has
// somewhere to navigate. Replace each route's page as it gets built.
export default function Placeholder({ title }) {
    return (
        <AuthenticatedLayout
            header={<h1 className="text-2xl font-medium text-ink">{title}</h1>}
        >
            <Head title={title} />

            <div className="px-8 py-6">
                <div className="rounded-lg border border-border bg-white p-6 text-ink-muted">
                    This screen is built in a later task.
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
