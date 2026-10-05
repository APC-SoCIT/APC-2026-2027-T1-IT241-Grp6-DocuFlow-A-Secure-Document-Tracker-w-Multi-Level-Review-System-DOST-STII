import { Card, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';

const ROLE_LABELS = {
    l1: 'Immediate Supervisor (L1)',
    l2: 'Section Head (L2)',
    l3: 'Division Chief (L3)',
};

// Plain stat card: small muted label, large number. No icons, no charts.
function Stat({ label, value }) {
    return (
        <Card>
            <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
            </CardHeader>
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

            <Card className="pb-0">
                <CardHeader>
                    <CardTitle>{dashboard.title}: workload</CardTitle>
                    <CardDescription>
                        Incomplete reviews currently assigned to each reviewer. New, Ongoing,
                        Pending and the averages above cover the same reviewers.
                    </CardDescription>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-4">Reviewer</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="pr-4 text-right">Workload</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dashboard.workload.map((row) => (
                            <TableRow key={row.name}>
                                <TableCell className="pl-4">{row.name}</TableCell>
                                <TableCell className="text-muted-foreground">{ROLE_LABELS[row.role]}</TableCell>
                                <TableCell className="pr-4 text-right font-medium tabular-nums">
                                    {row.count}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </section>
    );
}
