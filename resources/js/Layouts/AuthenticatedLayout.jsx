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
                                        <span className="truncate text-xs text-muted-foreground">
                                            {ROLE_LABELS[user.role]}
                                        </span>
                                    </div>
                                </DropdownMenuLabel>
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
 * bar with the global search and notifications in the middle, and a page
 * header with an optional Back button, title and actions. Both bars stay
 * fixed while the page scrolls. Flash messages: success as a toast, blocked
 * actions as an alert above the page.
 *
 * back: { fallback: url } — goes to the previous page in the app, or to
 * `fallback` when there is none.
 * surface: true for pages without cards (forms), so they sit on the plain
 * page background.
 */
export default function AuthenticatedLayout({ title, description, actions, back, surface = false, children, className }) {
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

                <SidebarInset className={cn('min-w-0', surface ? 'bg-background' : 'bg-muted/40')}>
                    <div className="sticky top-0 z-30 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b bg-background px-3 md:grid-cols-[1fr_minmax(0,40rem)_1fr] md:px-6">
                        <div>
                            <SidebarTrigger className="md:hidden" />
                        </div>
                        {/* Search and notifications sit together in the middle. */}
                        <div className="flex min-w-0 items-center gap-1.5">
                            <GlobalSearch />
                            <NotificationsBell unread={unreadNotifications} />
                        </div>
                    </div>

                    <header className="sticky top-14 z-20 border-b bg-background">
                        <div className="mx-auto flex min-h-14 w-full max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:px-6">
                            {back && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => goBack(back.fallback)}
                                    className="-ml-2 text-muted-foreground"
                                >
                                    <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
                                    Back
                                </Button>
                            )}
                            <h1 className="min-w-0 truncate font-heading text-lg font-semibold tracking-tight">{title}</h1>
                            {description && <div className="flex items-center gap-2">{description}</div>}
                            {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
                        </div>
                    </header>

                    <div className={cn('mx-auto w-full max-w-[1600px] flex-1 px-4 pt-5 pb-10 md:px-6', className)}>
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
