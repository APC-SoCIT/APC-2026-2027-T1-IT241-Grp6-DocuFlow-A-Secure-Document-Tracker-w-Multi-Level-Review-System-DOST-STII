import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';

export default function Index({ notifications }) {
    const hasUnread = notifications.some((n) => !n.is_read);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-2xl font-medium text-ink">Notifications</h1>
                    {hasUnread && (
                        <Button
                            variant="outlined"
                            onClick={() => router.post(route('notifications.read-all'))}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
            }
        >
            <Head title="Notifications" />

            <div className="px-8 py-6">
                <Card className="overflow-hidden">
                    {notifications.length === 0 ? (
                        <p className="px-6 py-12 text-center text-ink-muted">
                            You have no notifications yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {notifications.map((notification) => (
                                <li key={notification.id}>
                                    <Link
                                        href={route('notifications.read', notification.id)}
                                        method="post"
                                        as="button"
                                        className="flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-paper"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                                                notification.is_read ? 'bg-transparent' : 'bg-dost-blue',
                                            )}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={cn(
                                                    'block text-sm',
                                                    notification.is_read
                                                        ? 'text-ink-muted'
                                                        : 'font-medium text-ink',
                                                )}
                                            >
                                                {notification.message}
                                            </span>
                                            <span className="mt-1 block text-xs text-ink-muted">
                                                {formatDateTime(notification.created_at)}
                                                {!notification.is_read && (
                                                    <span className="sr-only"> · Unread</span>
                                                )}
                                            </span>
                                        </span>
                                        {notification.reference_number && (
                                            <span className="shrink-0 text-sm font-medium text-dost-blue">
                                                Open
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
