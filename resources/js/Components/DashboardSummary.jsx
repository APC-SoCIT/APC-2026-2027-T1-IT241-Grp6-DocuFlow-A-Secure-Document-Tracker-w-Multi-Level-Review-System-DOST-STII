import { Card, CardHeader, CardTitle } from '@/Components/ui/card';

const ROLE_LABELS = {
    l1: 'Immediate Supervisor (L1)',
    l2: 'Section Head (L2)',
    l3: 'Division Chief (L3)',
};

// White card, normal border, small gray label, large number (CLAUDE.md).
function Stat({ label, value }) {
    return (
        <div className="rounded-lg border border-border bg-white px-5 py-4">
            <div className="text-xs font-medium text-ink-muted">{label}</div>
            <div className="mt-1 text-2xl font-medium text-ink">{value}</div>
        </div>
    );
}

function noData(value, suffix = '') {
    return value === null || value === undefined ? 'No Data' : `${value}${suffix}`;
}

/**
 * Dashboard summary (stories #1, #6, #8, #10): plain numbers, no charts.
 * Document Source: their submissions. L1/L2: their queue + their section.
 * L3: their approval queue + the whole system.
 */
export default function DashboardSummary({ dashboard }) {
    if (dashboard.kind === 'source') {
        return (
            <section aria-label={dashboard.title} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="Total submitted" value={dashboard.total} />
                <Stat label="In review" value={dashboard.in_review} />
                <Stat label="Returned to Source" value={dashboard.returned} />
                <Stat label="Approved - Complete" value={dashboard.approved} />
            </section>
        );
    }

    if (dashboard.kind !== 'section' && dashboard.kind !== 'system') {
        return null;
    }

    return (
        <section aria-label={dashboard.title} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                <Stat
                    label={dashboard.kind === 'system' ? 'My approval queue' : 'My review queue'}
                    value={dashboard.queue}
                />
                <Stat label="New" value={dashboard.new} />
                <Stat label="Ongoing" value={dashboard.ongoing} />
                <Stat label="Pending" value={dashboard.pending} />
                <Stat label="Average TAT" value={noData(dashboard.average_tat, ' days')} />
                <Stat label="Average Rating" value={noData(dashboard.average_rating)} />
            </div>

            <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle>{dashboard.title}: workload</CardTitle>
                    <p className="mt-1 text-sm text-ink-muted">
                        Incomplete reviews currently assigned to each reviewer. New, Ongoing,
                        Pending and the averages above cover the same reviewers.
                    </p>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-y border-border">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-medium text-ink-muted">Reviewer</th>
                                <th scope="col" className="px-6 py-3 font-medium text-ink-muted">Role</th>
                                <th scope="col" className="px-6 py-3 text-right font-medium text-ink-muted">Workload</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {dashboard.workload.map((row) => (
                                <tr key={row.name}>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink">{row.name}</td>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink-muted">{ROLE_LABELS[row.role]}</td>
                                    <td className="px-6 py-3 text-right font-medium text-ink">{row.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </section>
    );
}
