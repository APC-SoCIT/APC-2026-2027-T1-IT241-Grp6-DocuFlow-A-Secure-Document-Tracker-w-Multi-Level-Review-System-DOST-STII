import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// Stored once for the whole app, so the rail keeps its state across pages.
const SIDEBAR_STORAGE_KEY = 'docuflow.sidebar.expanded';

const ROLE_LABELS = {
    document_source: 'Document Source',
    l1: 'Immediate Supervisor (L1)',
    l2: 'Section Head (L2)',
    l3: 'Division Chief (L3)',
};

function navItemsFor(role) {
    const isReviewer = role !== 'document_source';
    // Document Source, L1 and L2 can submit; the L3 can't.
    const canSubmit = role !== 'l3';

    return [
        isReviewer && { label: 'Review queue', icon: 'fact_check', route: 'reviews.index' },
        // UC-01: submitted by them, or is/was assigned to them.
        { label: 'My documents', icon: 'folder_open', route: 'documents.index' },
        canSubmit && { label: 'Submit document', icon: 'upload_file', route: 'documents.create' },
        { label: 'Notifications', icon: 'notifications', route: 'notifications.index' },
    ].filter(Boolean);
}

function readSidebarExpanded() {
    try {
        return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function Icon({ name, className }) {
    return (
        <span
            aria-hidden="true"
            className={cn('material-symbols-outlined shrink-0 leading-none', className)}
        >
            {name}
        </span>
    );
}

const navItemClass =
    'flex h-10 w-full items-center gap-3 rounded-md px-[10px] text-sm font-medium transition-colors';

export default function AuthenticatedLayout({ header, children }) {
    const { auth, flash, unreadNotifications } = usePage().props;
    const user = auth.user;
    const [expanded, setExpanded] = useState(readSidebarExpanded);

    useEffect(() => {
        try {
            window.localStorage.setItem(SIDEBAR_STORAGE_KEY, expanded ? '1' : '0');
        } catch {
            // Storage unavailable (e.g. private mode); state just won't persist.
        }
    }, [expanded]);

    return (
        <div className="flex min-h-screen bg-paper text-ink">
            <aside
                className={cn(
                    'sticky top-0 flex h-screen shrink-0 flex-col bg-paper-dim px-2 py-4 transition-[width] duration-200',
                    expanded ? 'w-60' : 'w-[60px]',
                )}
            >
                <div className="mb-6 flex h-10 items-center gap-3 overflow-hidden px-[10px]">
                    <Icon name="description" className="text-dost-blue" />
                    {expanded && (
                        <span className="whitespace-nowrap text-base font-bold">
                            DocuFlow
                        </span>
                    )}
                </div>

                <nav className="flex flex-col gap-1">
                    {navItemsFor(user.role).map((item) => {
                        const active = route().current(item.route);
                        const count =
                            item.route === 'notifications.index' ? unreadNotifications : 0;
                        const countLabel = count > 99 ? '99+' : count;
                        const bubbleColors = active
                            ? 'bg-white text-dost-blue'
                            : 'bg-dost-blue text-white';

                        return (
                            <Link
                                key={item.route}
                                href={route(item.route)}
                                title={
                                    expanded
                                        ? undefined
                                        : count
                                          ? `${item.label} (${count} unread)`
                                          : item.label
                                }
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    navItemClass,
                                    'overflow-hidden',
                                    active
                                        ? 'bg-dost-blue text-white hover:bg-dost-blue-deep'
                                        : 'text-ink-muted hover:bg-paper hover:text-ink',
                                )}
                            >
                                <span className="relative flex shrink-0">
                                    <Icon name={item.icon} />
                                    {count > 0 && !expanded && (
                                        <span
                                            className={cn(
                                                'absolute -right-1.5 -top-1 min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4',
                                                bubbleColors,
                                            )}
                                        >
                                            {countLabel}
                                        </span>
                                    )}
                                </span>
                                {expanded && (
                                    <span className="whitespace-nowrap">{item.label}</span>
                                )}
                                {count > 0 && expanded && (
                                    <span
                                        className={cn(
                                            'ml-auto min-w-5 rounded-full px-1.5 text-center text-xs font-bold leading-5',
                                            bubbleColors,
                                        )}
                                    >
                                        {countLabel}
                                    </span>
                                )}
                                {count > 0 && <span className="sr-only">, {count} unread</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto flex flex-col gap-1">
                    <div
                        className="flex min-h-10 items-center gap-3 overflow-hidden px-[10px] py-1"
                        title={expanded ? undefined : `${user.name} · ${ROLE_LABELS[user.role]}`}
                    >
                        <Icon name="account_circle" className="text-ink-muted" />
                        {expanded && (
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{user.name}</div>
                                <div className="truncate text-xs text-ink-muted">
                                    {ROLE_LABELS[user.role]}
                                </div>
                            </div>
                        )}
                    </div>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        title={expanded ? undefined : 'Log out'}
                        className={cn(
                            navItemClass,
                            'overflow-hidden text-ink-muted hover:bg-paper hover:text-ink',
                        )}
                    >
                        <Icon name="logout" />
                        {expanded && <span className="whitespace-nowrap">Log out</span>}
                    </Link>

                    <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        className={cn(
                            navItemClass,
                            'text-ink-muted hover:bg-paper hover:text-ink',
                        )}
                    >
                        <Icon name={expanded ? 'chevron_left' : 'chevron_right'} />
                    </button>
                </div>
            </aside>

            <div className="min-w-0 flex-1">
                {header && <header className="px-8 pt-8">{header}</header>}

                {flash.success && (
                    <div
                        role="status"
                        className="mx-8 mt-6 flex items-center gap-3 rounded-lg bg-stamp-green-bg px-4 py-3 text-sm font-medium text-stamp-green"
                    >
                        <Icon name="check_circle" />
                        {flash.success}
                    </div>
                )}

                {flash.error && (
                    <div
                        role="alert"
                        className="mx-8 mt-6 flex items-center gap-3 rounded-lg bg-stamp-rust-bg px-4 py-3 text-sm font-medium text-stamp-rust"
                    >
                        <Icon name="error" />
                        {flash.error}
                    </div>
                )}

                <main>{children}</main>
            </div>
        </div>
    );
}
