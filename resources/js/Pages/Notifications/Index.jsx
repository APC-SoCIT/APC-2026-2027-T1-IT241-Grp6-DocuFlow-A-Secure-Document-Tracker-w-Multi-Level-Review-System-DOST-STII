import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { BellIcon, CheckCheckIcon, ChevronRightIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';

export default function Index({ notifications }) {
    const hasUnread = notifications.some((n) => !n.is_read);
    const [markingAll, setMarkingAll] = useState(false);

    function markAllRead() {
        router.post(route('notifications.read-all'), {}, {
            onStart: () => setMarkingAll(true),
            onFinish: () => setMarkingAll(false),
        });
    }

    return (
        <AuthenticatedLayout
            title="Notifications"
            description="Updates on documents you submitted or review."
            actions={
                hasUnread && (
                    <Button variant="outline" disabled={markingAll} onClick={markAllRead}>
                        {markingAll ? (
                            <Loader2Icon className="animate-spin" aria-hidden="true" />
                        ) : (
                            <CheckCheckIcon data-icon="inline-start" aria-hidden="true" />
                        )}
                        Mark all as read
                    </Button>
                )
            }
        >
            <Head title="Notifications" />

            <Card className="max-w-4xl gap-0 py-0">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center px-6 py-16 text-center">
                        <BellIcon className="size-8 text-muted-foreground" aria-hidden="true" />
                        <p className="mt-3 text-muted-foreground">You have no notifications yet.</p>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {notifications.map((notification) => (
                            <li key={notification.id}>
                                <Link
                                    href={route('notifications.read', notification.id)}
                                    method="post"
                                    as="button"
                                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'mt-1.5 size-2 shrink-0 rounded-full',
                                            notification.is_read ? 'bg-transparent' : 'bg-primary',
                                        )}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={cn(
                                                'block text-[13px]',
                                                notification.is_read ? 'text-muted-foreground' : 'font-medium',
                                            )}
                                        >
                                            {notification.message}
                                        </span>
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            {formatDateTime(notification.created_at)}
                                            {!notification.is_read && <span className="sr-only"> · Unread</span>}
                                        </span>
                                    </span>
                                    {notification.reference_number && (
                                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                                            Open
                                            <ChevronRightIcon className="size-4" aria-hidden="true" />
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </AuthenticatedLayout>
    );
}
