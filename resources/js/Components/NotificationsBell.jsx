import { Button } from '@/Components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Skeleton } from '@/Components/ui/skeleton';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { BellIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

/**
 * Bell in the top bar. Opens a popover with the latest notifications;
 * clicking one marks it read and opens its document. "View all" goes to the
 * Notifications page.
 */
export default function NotificationsBell({ unread }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);

    const load = useCallback(() => {
        axios
            .get(route('notifications.recent'))
            .then(({ data }) => setItems(data.notifications))
            .catch(() => setItems([]));
    }, []);

    useEffect(() => {
        if (open) load();
    }, [open, load]);

    function markAllRead() {
        router.post(route('notifications.read-all'), {}, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setMarkingAll(true),
            onFinish: () => setMarkingAll(false),
            onSuccess: load,
        });
    }

    function openNotification(id) {
        setOpen(false);
        router.post(route('notifications.read', id));
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative shrink-0"
                    aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                >
                    <BellIcon aria-hidden="true" />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-background">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0">
                <div className="flex items-center justify-between gap-2 border-b py-2 pr-2 pl-4">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-sm font-semibold">Notifications</h2>
                        {unread > 0 && (
                            <span className="text-xs text-muted-foreground tabular-nums">{unread} unread</span>
                        )}
                    </div>
                    {unread > 0 && (
                        <Button variant="ghost" size="sm" disabled={markingAll} onClick={markAllRead}>
                            Mark all as read
                        </Button>
                    )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {items === null ? (
                        <div className="space-y-3 p-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-3/4" />
                        </div>
                    ) : items.length === 0 ? (
                        <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">
                            You have no notifications yet.
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {items.map((n) => (
                                <li key={n.id}>
                                    <button
                                        type="button"
                                        onClick={() => openNotification(n.id)}
                                        className={cn(
                                            'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                                            !n.is_read && 'bg-muted/30',
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'mt-1.5 size-2 shrink-0 rounded-full',
                                                n.is_read ? 'bg-transparent' : 'bg-primary',
                                            )}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={cn(
                                                    'line-clamp-2 text-[13px] leading-snug',
                                                    n.is_read ? 'text-muted-foreground' : 'font-medium',
                                                )}
                                            >
                                                {n.message}
                                            </span>
                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                {formatRelative(n.created_at)}
                                                {n.reference_number && ` · ${n.reference_number}`}
                                                {!n.is_read && <span className="sr-only"> · Unread</span>}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="border-t p-1">
                    <Button variant="ghost" className="w-full justify-center" asChild>
                        <Link href={route('notifications.index')} onClick={() => setOpen(false)}>
                            View all notifications
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
