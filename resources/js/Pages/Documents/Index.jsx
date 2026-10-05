import DocumentTable from '@/Components/DocumentTable';
import { Button } from '@/Components/ui/button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDate } from '@/lib/format';
import { ROLE_FILTER_LABELS } from '@/lib/status';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { XIcon } from 'lucide-react';

// The filters themselves live in the search box in the header; here they
// show as chips that can be removed one by one or all at once.
function ActiveFilters({ filters, statusOptions }) {
    const chips = [
        filters.search && { key: 'search', label: `“${filters.search}”` },
        filters.status && { key: 'status', label: statusOptions[filters.status] },
        filters.role && { key: 'role', label: ROLE_FILTER_LABELS[filters.role] },
        filters.from && { key: 'from', label: `From ${formatDate(filters.from)}` },
        filters.to && { key: 'to', label: `To ${formatDate(filters.to)}` },
    ].filter(Boolean);

    if (chips.length === 0) {
        return null;
    }

    const visit = (next) =>
        router.get(route('documents.index'), next, { preserveState: true, preserveScroll: true, replace: true });

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Filtered by</span>
            {chips.map((chip) => (
                <span
                    key={chip.key}
                    className="inline-flex h-7 items-center gap-1 rounded-full border bg-background pr-1 pl-3 text-xs font-medium"
                >
                    {chip.label}
                    <button
                        type="button"
                        aria-label={`Remove filter ${chip.label}`}
                        onClick={() => {
                            const { [chip.key]: _removed, ...rest } = filters;
                            visit(rest);
                        }}
                        className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <XIcon aria-hidden="true" className="size-3" />
                    </button>
                </span>
            ))}
            <Button variant="ghost" size="sm" onClick={() => visit({})}>
                Clear
            </Button>
        </div>
    );
}

export default function Index({ documents, filters, statusOptions }) {
    const { auth } = usePage().props;
    const filtering = Object.keys(filters).length > 0;
    const canSubmit = auth.user.role !== 'l3';

    return (
        <AuthenticatedLayout
            title="My documents"
            actions={
                canSubmit && (
                    <Button asChild>
                        <Link href={route('documents.create')}>Submit document
                        </Link>
                    </Button>
                )
            }
        >
            <Head title="My documents" />

            <div className="space-y-3">
                {filtering && (
                    <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold">
                            Results
                            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                                {documents.length}
                            </span>
                        </h2>
                        <ActiveFilters filters={filters} statusOptions={statusOptions} />
                    </div>
                )}

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
