import GlobalSearch from '@/Components/GlobalSearch';
import NotificationsBell from '@/Components/NotificationsBell';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
    useSidebar,
} from '@/Components/ui/sidebar';
import { Toaster } from '@/Components/ui/sonner';
import { TooltipProvider } from '@/Components/ui/tooltip';
import { goBack } from '@/lib/navigation';
import { ROLE_LABELS } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    BellIcon,
    ChevronsUpDownIcon,
    ClipboardCheckIcon,
    FilePlusIcon,
    FileTextIcon,
    FolderOpenIcon,
    LogOutIcon,
    OctagonXIcon,
    PanelLeftCloseIcon,
    PanelLeftOpenIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Stored once for the whole app, so the rail keeps its state across pages.
const SIDEBAR_STORAGE_KEY = 'docuflow.sidebar.expanded';

function navItemsFor(role) {
    const isReviewer = role !== 'document_source';
    // Document Source, L1 and L2 can submit; the L3 can't.
    const canSubmit = role !== 'l3';

    return [
        isReviewer && { label: 'Review queue', icon: ClipboardCheckIcon, route: 'reviews.index' },
        // UC-01: submitted by them, or is/was assigned to them.
        { label: 'My documents', icon: FolderOpenIcon, route: 'documents.index' },
        canSubmit && { label: 'Submit document', icon: FilePlusIcon, route: 'documents.create' },
        { label: 'Notifications', icon: BellIcon, route: 'notifications.index' },
    ].filter(Boolean);
}

function readSidebarExpanded() {
    try {
        return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function initials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

function AppSidebar({ user, unreadNotifications }) {
    const { open, isMobile, toggleSidebar } = useSidebar();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="hover:bg-transparent active:bg-transparent">
                            <Link href={route('dashboard')}>
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:-ml-1">
                                    <FileTextIcon className="size-3.5!" aria-hidden="true" />
                                </span>
                                <span className="font-heading text-[15px] font-semibold tracking-tight">DocuFlow</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0.5">
                            {navItemsFor(user.role).map((item) => {
                                const count =
                                    item.route === 'notifications.index' ? unreadNotifications : 0;
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.route}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={route().current(item.route)}
                                            tooltip={count ? `${item.label} (${count} unread)` : item.label}
                                            className="h-9 text-[13px] text-sidebar-foreground/80 data-active:text-sidebar-foreground"
                                        >
                                            <Link href={route(item.route)}>
                                                <span className="relative flex">
                                                    <Icon aria-hidden="true" />
                                                    {count > 0 && (
                                                        <span className="absolute -top-1 -right-1 hidden size-2 rounded-full bg-destructive ring-2 ring-sidebar group-data-[collapsible=icon]:block" />
                                                    )}
                                                </span>
                                                <span>{item.label}</span>
                                                {count > 0 && (
                                                    <Badge className="ml-auto h-4.5 min-w-4.5 px-1 text-[10px] tabular-nums group-data-[collapsible=icon]:hidden">
                                                        {count > 99 ? '99+' : count}
                                                    </Badge>
                                                )}
                                                {count > 0 && <span className="sr-only">, {count} unread</span>}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="gap-1 border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    tooltip={`${user.name} · ${ROLE_LABELS[user.role]}`}
                                    className="h-11 data-[state=open]:bg-sidebar-accent"
                                >
                                    <Avatar className="size-7 rounded-md">
                                        <AvatarFallback className="rounded-md bg-sidebar-accent text-[11px] font-medium">
                                            {initials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left leading-tight">
                                        <span className="truncate text-[13px] font-medium">{user.name}</span>
                                        <span className="truncate text-[11px] text-muted-foreground">
                                            {ROLE_LABELS[user.role]}
                                        </span>
                                    </div>
                                    <ChevronsUpDownIcon className="ml-auto text-muted-foreground" aria-hidden="true" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side={isMobile ? 'top' : 'right'}
                                align="end"
                                sideOffset={8}
                                className="w-64 p-1.5"
                            >
                                <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal text-foreground">
                                    <Avatar className="size-9 rounded-lg">
                                        <AvatarFallback className="rounded-lg bg-muted text-xs font-medium">
                                            {initials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid min-w-0 leading-tight">
                                        <span className="truncate text-sm font-medium">{user.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                                        <span className="mt-1 truncate text-[11px] text-muted-foreground">
                                            {ROLE_LABELS[user.role]}
                                        </span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="gap-2.5 px-2 py-1.5">
                                    <Link href={route('documents.index')}>
                                        <FolderOpenIcon aria-hidden="true" />
                                        My documents
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="gap-2.5 px-2 py-1.5">
                                    <Link href={route('notifications.index')}>
                                        <BellIcon aria-hidden="true" />
                                        Notifications
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="gap-2.5 px-2 py-1.5"
                                    onSelect={() => router.post(route('logout'))}
                                >
                                    <LogOutIcon aria-hidden="true" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>

                    {/* Desktop only: on phones the sidebar is a slide-over menu. */}
                    {!isMobile && (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={toggleSidebar}
                                aria-expanded={open}
                                tooltip="Expand sidebar"
                                className="h-8 text-[13px] text-muted-foreground"
                            >
                                {open ? (
                                    <PanelLeftCloseIcon aria-hidden="true" />
                                ) : (
                                    <PanelLeftOpenIcon aria-hidden="true" />
                                )}
                                <span>{open ? 'Collapse sidebar' : 'Expand sidebar'}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

/**
 * App shell: collapsible sidebar (state remembered across the app), a top
 * bar with the global search, and a page header with an optional Back
 * button, title, description and actions. Flash messages: success as a
 * toast, blocked actions as an alert above the page.
 *
 * back: { fallback: url } — goes to the previous page in the app, or to
 * `fallback` when there is none.
 */
export default function AuthenticatedLayout({ title, description, actions, back, children, className }) {
    const { auth, flash, unreadNotifications } = usePage().props;
    const [expanded, setExpanded] = useState(readSidebarExpanded);

    useEffect(() => {
        try {
            window.localStorage.setItem(SIDEBAR_STORAGE_KEY, expanded ? '1' : '0');
        } catch {
            // Storage unavailable (e.g. private mode); state just won't persist.
        }
    }, [expanded]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success, { duration: 6000 });
        }
    }, [flash.success]);

    return (
        <TooltipProvider delayDuration={300}>
            <SidebarProvider
                open={expanded}
                onOpenChange={setExpanded}
                style={{ '--sidebar-width': '14rem' }}
            >
                <AppSidebar user={auth.user} unreadNotifications={unreadNotifications} />

                <SidebarInset className="min-w-0 bg-muted/40">
                    <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-6">
                        <SidebarTrigger className="md:hidden" />
                        {/* Search and notifications sit together in the right corner. */}
                        <div className="ml-auto flex w-full min-w-0 max-w-lg items-center gap-1.5">
                            <GlobalSearch />
                            <NotificationsBell unread={unreadNotifications} />
                        </div>
                    </div>

                    <div className={cn('mx-auto w-full max-w-[1600px] flex-1 px-4 pt-5 pb-10 md:px-6', className)}>
                        <header className="mb-5">
                            {back && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => goBack(back.fallback)}
                                    className="mb-2 -ml-2 text-muted-foreground"
                                >
                                    <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
                                    Back
                                </Button>
                            )}
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h1 className="font-heading text-xl font-semibold tracking-tight text-balance">
                                        {title}
                                    </h1>
                                    {description && (
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                                            {description}
                                        </div>
                                    )}
                                </div>
                                {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                            </div>
                        </header>

                        {flash.error && (
                            <Alert variant="destructive" className="mb-5">
                                <OctagonXIcon aria-hidden="true" />
                                <AlertDescription className="text-destructive">{flash.error}</AlertDescription>
                            </Alert>
                        )}

                        {children}
                    </div>
                </SidebarInset>

                <Toaster position="top-right" />
            </SidebarProvider>
        </TooltipProvider>
    );
}
