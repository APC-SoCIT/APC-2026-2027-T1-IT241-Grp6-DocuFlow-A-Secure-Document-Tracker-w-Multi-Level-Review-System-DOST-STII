import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
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
    SidebarTrigger,
    useSidebar,
} from '@/Components/ui/sidebar';
import { Toaster } from '@/Components/ui/sonner';
import { TooltipProvider } from '@/Components/ui/tooltip';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BellIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    ChevronsUpDownIcon,
    ClipboardCheckIcon,
    FilePlusIcon,
    FileTextIcon,
    FolderOpenIcon,
    LogOutIcon,
    OctagonXIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
        isReviewer && {
            label: 'Review queue',
            icon: ClipboardCheckIcon,
            route: 'reviews.index',
        },
        // UC-01: submitted by them, or is/was assigned to them.
        {
            label: 'My documents',
            icon: FolderOpenIcon,
            route: 'documents.index',
        },
        canSubmit && {
            label: 'Submit document',
            icon: FilePlusIcon,
            route: 'documents.create',
        },
        {
            label: 'Notifications',
            icon: BellIcon,
            route: 'notifications.index',
        },
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
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={route('dashboard')}>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <FileTextIcon className="size-4" aria-hidden="true" />
                                </div>
                                <div className="grid flex-1 text-left leading-tight">
                                    <span className="truncate font-heading font-semibold">
                                        DocuFlow
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Document tracker
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItemsFor(user.role).map((item) => {
                                const count =
                                    item.route === 'notifications.index' ? unreadNotifications : 0;
                                const countLabel = count > 99 ? '99+' : count;
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.route}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={route().current(item.route)}
                                            tooltip={
                                                count
                                                    ? `${item.label} (${count} unread)`
                                                    : item.label
                                            }
                                        >
                                            <Link href={route(item.route)}>
                                                <span className="relative flex">
                                                    <Icon aria-hidden="true" />
                                                    {count > 0 && (
                                                        <span className="absolute -top-0.5 -right-0.5 hidden size-2 rounded-full bg-destructive group-data-[collapsible=icon]:block" />
                                                    )}
                                                </span>
                                                <span>{item.label}</span>
                                                {count > 0 && (
                                                    <Badge className="ml-auto group-data-[collapsible=icon]:hidden">
                                                        {countLabel}
                                                    </Badge>
                                                )}
                                                {count > 0 && (
                                                    <span className="sr-only">
                                                        , {count} unread
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    tooltip={`${user.name} · ${ROLE_LABELS[user.role]}`}
                                    className="data-[state=open]:bg-sidebar-accent"
                                >
                                    <Avatar className="size-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg">
                                            {initials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {ROLE_LABELS[user.role]}
                                        </span>
                                    </div>
                                    <ChevronsUpDownIcon className="ml-auto" aria-hidden="true" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right" align="end" className="min-w-56">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="grid text-sm leading-tight">
                                        <span className="truncate font-medium">{user.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {user.email}
                                        </span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => router.post(route('logout'))}>
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
                                className="text-muted-foreground"
                            >
                                {open ? (
                                    <ChevronsLeftIcon aria-hidden="true" />
                                ) : (
                                    <ChevronsRightIcon aria-hidden="true" />
                                )}
                                <span>{open ? 'Collapse sidebar' : 'Expand sidebar'}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}

/**
 * App shell: collapsible sidebar (state remembered across the app), a page
 * header with a title and optional actions, and flash messages: success as a
 * toast, blocked actions as an alert above the page.
 */
export default function AuthenticatedLayout({ title, actions, children }) {
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
        <TooltipProvider>
            <SidebarProvider open={expanded} onOpenChange={setExpanded}>
                <AppSidebar user={auth.user} unreadNotifications={unreadNotifications} />

                <SidebarInset>
                    <header className="flex flex-wrap items-center gap-3 px-4 pt-6 md:px-8">
                        <SidebarTrigger className="-ml-1 md:hidden" />
                        <h1 className="min-w-0 flex-1 font-heading text-2xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        {actions && <div className="flex items-center gap-2">{actions}</div>}
                    </header>

                    <div className="flex-1 px-4 pt-6 pb-10 md:px-8">
                        {flash.error && (
                            <Alert variant="destructive" className="mb-6">
                                <OctagonXIcon aria-hidden="true" />
                                <AlertDescription className="text-destructive">
                                    {flash.error}
                                </AlertDescription>
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
