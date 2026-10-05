import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { router } from '@inertiajs/react';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const EMPTY = { search: '', status: '', from: '', to: '', role: '' };

// Select items can't have an empty value, so "no filter" is "all" in the UI.
const ALL = 'all';

/**
 * Filter bar for the document list: search, status, Date Submitted range
 * and (L1/L2 only) a role filter. Filters live in the URL; Clear resets them.
 */
export default function DocumentFilters({ filters, statusOptions, canFilterByRole }) {
    const [values, setValues] = useState({ ...EMPTY, ...filters });
    const firstRender = useRef(true);

    function apply(next) {
        const params = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== ''));
        router.get(route('documents.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function update(field, value) {
        const next = { ...values, [field]: value === ALL ? '' : value };
        setValues(next);
        // Search waits for a pause in typing (below); everything else applies now.
        if (field !== 'search') {
            apply(next);
        }
    }

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return undefined;
        }
        const timer = setTimeout(() => apply(values), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values.search]);

    const hasFilters = Object.values(values).some((v) => v !== '');

    return (
        <Card>
            <CardContent className="flex flex-wrap items-end gap-4">
                <div className="grid min-w-56 flex-1 gap-2">
                    <Label htmlFor="filter-search">Search</Label>
                    <div className="relative">
                        <SearchIcon
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            id="filter-search"
                            type="search"
                            placeholder="Reference number or document type"
                            value={values.search}
                            onChange={(e) => update('search', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && apply(values)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="grid w-52 gap-2">
                    <Label htmlFor="filter-status">Status</Label>
                    <Select value={values.status || ALL} onValueChange={(v) => update('status', v)}>
                        <SelectTrigger id="filter-status" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All statuses</SelectItem>
                            {Object.entries(statusOptions).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid w-40 gap-2">
                    <Label htmlFor="filter-from">Submitted from</Label>
                    <Input
                        id="filter-from"
                        type="date"
                        value={values.from}
                        max={values.to || undefined}
                        onChange={(e) => update('from', e.target.value)}
                    />
                </div>

                <div className="grid w-40 gap-2">
                    <Label htmlFor="filter-to">Submitted to</Label>
                    <Input
                        id="filter-to"
                        type="date"
                        value={values.to}
                        min={values.from || undefined}
                        onChange={(e) => update('to', e.target.value)}
                    />
                </div>

                {canFilterByRole && (
                    <div className="grid w-44 gap-2">
                        <Label htmlFor="filter-role">Role</Label>
                        <Select value={values.role || ALL} onValueChange={(v) => update('role', v)}>
                            <SelectTrigger id="filter-role" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All my documents</SelectItem>
                                <SelectItem value="submitted">Submitted by me</SelectItem>
                                <SelectItem value="assigned">Assigned to me</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <Button
                    variant="outline"
                    disabled={!hasFilters}
                    onClick={() => {
                        setValues(EMPTY);
                        apply(EMPTY);
                    }}
                >
                    <XIcon data-icon="inline-start" aria-hidden="true" />
                    Clear
                </Button>
            </CardContent>
        </Card>
    );
}
