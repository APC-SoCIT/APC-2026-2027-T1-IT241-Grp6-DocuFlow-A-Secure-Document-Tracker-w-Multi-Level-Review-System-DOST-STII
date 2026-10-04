import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { NativeSelect } from '@/Components/ui/native-select';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const EMPTY = { search: '', status: '', from: '', to: '', role: '' };

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
        const next = { ...values, [field]: value };
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
            <CardContent className="flex flex-wrap items-end gap-4 p-4">
                <div className="min-w-56 flex-1">
                    <Label htmlFor="filter-search">Search</Label>
                    <div className="relative">
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-muted"
                        >
                            search
                        </span>
                        <Input
                            id="filter-search"
                            type="search"
                            placeholder="Reference number or document type"
                            value={values.search}
                            onChange={(e) => update('search', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && apply(values)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="w-52">
                    <Label htmlFor="filter-status">Status</Label>
                    <NativeSelect
                        id="filter-status"
                        value={values.status}
                        onChange={(e) => update('status', e.target.value)}
                    >
                        <option value="">All statuses</option>
                        {Object.entries(statusOptions).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </NativeSelect>
                </div>

                <div className="w-40">
                    <Label htmlFor="filter-from">Submitted from</Label>
                    <Input
                        id="filter-from"
                        type="date"
                        value={values.from}
                        max={values.to || undefined}
                        onChange={(e) => update('from', e.target.value)}
                    />
                </div>

                <div className="w-40">
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
                    <div className="w-44">
                        <Label htmlFor="filter-role">Role</Label>
                        <NativeSelect
                            id="filter-role"
                            value={values.role}
                            onChange={(e) => update('role', e.target.value)}
                        >
                            <option value="">All my documents</option>
                            <option value="submitted">Submitted by me</option>
                            <option value="assigned">Assigned to me</option>
                        </NativeSelect>
                    </div>
                )}

                <Button
                    variant="outlined"
                    disabled={!hasFilters}
                    onClick={() => {
                        setValues(EMPTY);
                        apply(EMPTY);
                    }}
                >
                    Clear
                </Button>
            </CardContent>
        </Card>
    );
}
