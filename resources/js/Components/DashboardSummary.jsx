import { Card } from '@/Components/ui/card';
import { ROLE_LABELS } from '@/lib/status';

// Plain stat card: small muted label, large number. No icons, no charts.
function Stat({ label, value }) {
    return (
        <Card className="gap-1 px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
        </Card>
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
            <section aria-label={dashboard.title} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <section aria-label={dashboard.title} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
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

            <Card className="gap-0 py-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-4 py-2.5">
                    <h2 className="text-sm font-semibold">{dashboard.title}: workload</h2>
                    <p className="text-xs text-muted-foreground">
                        Incomplete reviews assigned to each reviewer. The numbers above cover the same reviewers.
                    </p>
                </div>
                <ul className="grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                    {dashboard.workload.map((row) => (
                        <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <span className="min-w-0">
                                <span className="block truncate text-[13px] font-medium">{row.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                    {ROLE_LABELS[row.role]}
                                </span>
                            </span>
                            <span className="font-heading text-lg font-semibold tabular-nums">{row.count}</span>
                        </li>
                    ))}
                </ul>
            </Card>
        </section>
    );
}
