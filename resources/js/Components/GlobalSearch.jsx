import StatusBadge from '@/Components/StatusBadge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Skeleton } from '@/Components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { ROLE_FILTER_LABELS, STATUS_LABELS } from '@/lib/status';
import { cn } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ArrowRightIcon, FileTextIcon, HistoryIcon, SearchIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const EMPTY = { search: '', status: '', role: '', from: '', to: '' };
const RECENT_KEY = 'docuflow.recentSearches';
const LIST_COMPONENT = 'Documents/Index';

function readRecent() {
    try {
        return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function rememberSearch(term) {
    if (!term) return;
    try {
        const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, 5);
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
        // Storage unavailable; recent searches just won't be kept.
    }
}

function params(values) {
    return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''));
}

function FilterChip({ active, onClick, children }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'h-7 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted',
            )}
        >
            {children}
        </button>
    );
}

function FilterRow({ label, children }) {
    return (
        <div className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-start">
            <span className="pt-1.5 text-xs font-medium text-muted-foreground">{label}</span>
            <div className="flex flex-wrap items-center gap-1.5">{children}</div>
        </div>
    );
}

/**
 * Search box in the header, on every page. The panel under it holds the
 * filters (status, role for L1/L2, Date Submitted), quick results and recent
 * searches. Enter or "See all results" opens My documents with the filters.
 * On My documents itself, changes apply to the list right away.
 */
export default function GlobalSearch() {
    const { component, props } = usePage();
    const onList = component === LIST_COMPONENT;
    const canFilterByRole = ['l1', 'l2'].includes(props.auth.user.role);

    const [values, setValues] = useState(() => ({ ...EMPTY, ...(onList ? props.filters : {}) }));
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState(null);
    const [recent, setRecent] = useState([]);
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const requestId = useRef(0);

    // Follow the list's filters when they change from the page (chips, Clear).
    const listFilters = onList ? JSON.stringify(props.filters) : null;
    useEffect(() => {
        if (listFilters !== null) {
            setValues({ ...EMPTY, ...JSON.parse(listFilters) });
        }
    }, [listFilters]);

    const hasFilters = Object.entries(values).some(([key, v]) => key !== 'search' && v !== '');

    const applyToList = useCallback((next, { remember = false } = {}) => {
        if (remember) rememberSearch(next.search.trim());
        router.get(route('documents.index'), params(next), {
            preserveState: true,
            preserveScroll: onList,
            replace: onList,
        });
    }, [onList]);

    function update(field, value) {
        const next = { ...values, [field]: values[field] === value ? '' : value };
        setValues(next);
        if (onList) applyToList(next);
    }

    function setField(field, value) {
        const next = { ...values, [field]: value };
        setValues(next);
        if (onList && field !== 'search') applyToList(next);
    }

    function seeAll() {
        setOpen(false);
        inputRef.current?.blur();
        applyToList(values, { remember: true });
    }

    function clearAll() {
        setValues(EMPTY);
        if (onList) applyToList(EMPTY);
    }

    // Typing on My documents updates the list after a short pause.
    const firstSearch = useRef(true);
    useEffect(() => {
        if (firstSearch.current) {
            firstSearch.current = false;
            return undefined;
        }
        if (!onList) return undefined;
        const timer = setTimeout(() => applyToList(values), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values.search]);

    // Quick results while the panel is open.
    useEffect(() => {
        if (!open) return undefined;
        const id = ++requestId.current;
        const timer = setTimeout(() => {
            axios
                .get(route('documents.search'), { params: params(values) })
                .then(({ data }) => id === requestId.current && setResults(data.documents))
                .catch(() => id === requestId.current && setResults([]));
        }, 200);
        return () => clearTimeout(timer);
    }, [open, values]);

    useEffect(() => {
        if (open) setRecent(readRecent());
    }, [open]);

    // Close when clicking outside; Ctrl+K or "/" focuses the box.
    useEffect(() => {
        function onPointerDown(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
        }
        function onKeyDown(event) {
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
            if ((event.key === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing)) {
                event.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        }
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    const query = values.search.trim();
    const resultsTitle = query || hasFilters ? 'Documents' : 'Recently submitted';

    return (
        <div ref={rootRef} className="relative w-full max-w-xl">
            <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-expanded={open}
                aria-controls="global-search-panel"
                aria-label="Search documents"
                placeholder="Search by name, reference number or type"
                value={values.search}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                    setField('search', e.target.value);
                    setOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        seeAll();
                    } else if (e.key === 'Escape') {
                        setOpen(false);
                        e.currentTarget.blur();
                    }
                }}
                className="h-9 rounded-full bg-muted/60 pr-16 pl-9 shadow-none focus-visible:bg-background [&::-webkit-search-cancel-button]:hidden"
            />
            {hasFilters && !open && (
                <span className="pointer-events-none absolute top-1/2 right-12 size-1.5 -translate-y-1/2 rounded-full bg-primary" />
            )}
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-background px-1.5 font-sans text-[10px] font-medium text-muted-foreground sm:block">
                Ctrl K
            </kbd>

            {open && (
                <div
                    id="global-search-panel"
                    className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 sm:-right-24 sm:-left-24"
                >
                    <div className="space-y-3 border-b p-4">
                        <FilterRow label="Status">
                            <FilterChip active={!values.status} onClick={() => setField('status', '')}>
                                All
                            </FilterChip>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                <FilterChip
                                    key={value}
                                    active={values.status === value}
                                    onClick={() => update('status', value)}
                                >
                                    {label}
                                </FilterChip>
                            ))}
                        </FilterRow>

                        {canFilterByRole && (
                            <FilterRow label="Role">
                                <FilterChip active={!values.role} onClick={() => setField('role', '')}>
                                    All my documents
                                </FilterChip>
                                {Object.entries(ROLE_FILTER_LABELS).map(([value, label]) => (
                                    <FilterChip
                                        key={value}
                                        active={values.role === value}
                                        onClick={() => update('role', value)}
                                    >
                                        {label}
                                    </FilterChip>
                                ))}
                            </FilterRow>
                        )}

                        <FilterRow label="Date Submitted">
                            <Input
                                type="date"
                                aria-label="Date Submitted from"
                                value={values.from}
                                max={values.to || undefined}
                                onChange={(e) => setField('from', e.target.value)}
                                className="h-7 w-36 text-xs md:text-xs"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input
                                type="date"
                                aria-label="Date Submitted to"
                                value={values.to}
                                min={values.from || undefined}
                                onChange={(e) => setField('to', e.target.value)}
                                className="h-7 w-36 text-xs md:text-xs"
                            />
                        </FilterRow>
                    </div>

                    <div className="max-h-[min(22rem,50vh)] overflow-y-auto p-2">
                        {!query && !hasFilters && recent.length > 0 && (
                            <div className="mb-1">
                                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Recent searches</p>
                                {recent.map((term) => (
                                    <button
                                        key={term}
                                        type="button"
                                        onClick={() => setField('search', term)}
                                        className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                                    >
                                        <HistoryIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                                        {term}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{resultsTitle}</p>
                        {results === null ? (
                            <div className="space-y-2 px-2 py-1">
                                <Skeleton className="h-9 w-full" />
                                <Skeleton className="h-9 w-full" />
                                <Skeleton className="h-9 w-4/5" />
                            </div>
                        ) : results.length === 0 ? (
                            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No records found</p>
                        ) : (
                            results.map((doc) => (
                                <button
                                    key={doc.id}
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        rememberSearch(query);
                                        router.visit(route('documents.show', doc.id));
                                    }}
                                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                        <FileTextIcon aria-hidden="true" className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium">
                                            {doc.document_name ?? doc.reference_number}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {doc.reference_number} · {doc.document_type} · {formatDate(doc.submitted_at)}
                                        </span>
                                    </span>
                                    <StatusBadge status={doc.status} className="hidden sm:inline-flex" />
                                </button>
                            ))
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-3 py-2">
                        {hasFilters || query ? (
                            <Button variant="ghost" size="sm" onClick={clearAll}>
                                <XIcon data-icon="inline-start" aria-hidden="true" />
                                Clear
                            </Button>
                        ) : (
                            <span className="px-1 text-xs text-muted-foreground">Press Enter to see all results</span>
                        )}
                        <Button variant="ghost" size="sm" onClick={seeAll}>
                            See all results
                            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
