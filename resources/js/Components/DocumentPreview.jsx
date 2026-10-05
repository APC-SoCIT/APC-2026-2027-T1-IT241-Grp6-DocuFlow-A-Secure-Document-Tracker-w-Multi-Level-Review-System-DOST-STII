import OfficePreview from '@/Components/OfficePreview';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/Components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import {
    CircleAlertIcon,
    DownloadIcon,
    ExternalLinkIcon,
    FileIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    LinkIcon,
    Maximize2Icon,
} from 'lucide-react';
import { useCallback, useState } from 'react';

const FILE_LABELS = {
    pdf: { label: 'PDF', icon: FileTextIcon },
    docx: { label: 'Word document', icon: FileTextIcon },
    xlsx: { label: 'Excel spreadsheet', icon: FileSpreadsheetIcon },
};

function kindOf(preview) {
    if (preview.kind === 'google') return { label: 'Google Workspace link', icon: LinkIcon };
    return FILE_LABELS[preview.extension] ?? { label: 'Uploaded file', icon: FileIcon };
}

function IconAction({ label, children, ...props }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={label} {...props}>
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

/**
 * The document itself: Google link via /preview, PDF in an iframe,
 * .docx/.xlsx rendered in the browser. Used inline and in Full view.
 */
function PreviewSurface({ preview, title, onOfficeError }) {
    if (preview.kind === 'google' || preview.kind === 'pdf') {
        const src = preview.kind === 'google' ? preview.embed_url : preview.open_url;
        return <iframe src={src} title={`Preview of ${title}`} className="size-full bg-background" />;
    }

    return (
        <div className="size-full overflow-auto bg-background">
            <OfficePreview extension={preview.extension} url={preview.open_url} onError={onOfficeError} />
        </div>
    );
}

/**
 * Left-hand preview panel with a toolbar (Full view, open/download), and a
 * file card with an "Open" button when the document can't be shown here.
 */
export default function DocumentPreview({ preview, title, reference }) {
    const [officeFailed, setOfficeFailed] = useState(false);
    const [fullView, setFullView] = useState(false);
    const handleOfficeError = useCallback(() => setOfficeFailed(true), []);

    const kind = kindOf(preview);
    const KindIcon = kind.icon;
    const canRender =
        (preview.kind === 'google' && preview.embed_url) ||
        preview.kind === 'pdf' ||
        (preview.kind === 'file' && ['docx', 'xlsx'].includes(preview.extension) && !officeFailed);
    const isDownload = preview.kind === 'file';

    if (preview.kind === 'missing') {
        return (
            <Card className="h-full min-h-96 items-center justify-center p-8">
                <div role="alert" className="flex max-w-sm flex-col items-center text-center">
                    <CircleAlertIcon aria-hidden="true" className="size-8 text-destructive" />
                    <p className="mt-3 font-medium">The uploaded file is unavailable</p>
                    <p className="mt-1 text-muted-foreground">
                        The document's details, remarks and history are still available.
                    </p>
                </div>
            </Card>
        );
    }

    const openAction = (
        <IconAction label={isDownload ? 'Download' : 'Open in new tab'} asChild>
            <a href={preview.open_url} target={isDownload ? undefined : '_blank'} rel="noreferrer">
                {isDownload ? <DownloadIcon aria-hidden="true" /> : <ExternalLinkIcon aria-hidden="true" />}
            </a>
        </IconAction>
    );

    return (
        <Card className="h-full min-h-96 gap-0 py-0">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b pr-2 pl-4">
                <KindIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className="text-[13px] font-medium">Preview</span>
                <span className="truncate text-xs text-muted-foreground">{kind.label}</span>
                <div className="ml-auto flex items-center gap-0.5">
                    {canRender && (
                        <Button variant="ghost" size="sm" onClick={() => setFullView(true)}>
                            <Maximize2Icon data-icon="inline-start" aria-hidden="true" />
                            Full view
                        </Button>
                    )}
                    {openAction}
                </div>
            </div>

            {canRender ? (
                <div className="min-h-0 flex-1">
                    <PreviewSurface preview={preview} title={title} onOfficeError={handleOfficeError} />
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                    <div className="flex max-w-sm flex-col items-center text-center">
                        <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <KindIcon aria-hidden="true" className="size-6" />
                        </span>
                        <p className="mt-3 font-medium">{kind.label}</p>
                        <p className="mt-1 text-muted-foreground">
                            {preview.kind === 'google'
                                ? "This link can't be previewed here."
                                : "This file couldn't be previewed here. Open it to read it."}
                        </p>
                        <Button variant="outline" className="mt-4" asChild>
                            <a href={preview.open_url} target={isDownload ? undefined : '_blank'} rel="noreferrer">
                                Open
                                {isDownload ? (
                                    <DownloadIcon data-icon="inline-end" aria-hidden="true" />
                                ) : (
                                    <ExternalLinkIcon data-icon="inline-end" aria-hidden="true" />
                                )}
                            </a>
                        </Button>
                    </div>
                </div>
            )}

            {/* Full view: the document fills the screen, like a file viewer. */}
            <Dialog open={fullView} onOpenChange={setFullView}>
                <DialogContent
                    showCloseButton={false}
                    className="top-0 left-0 flex h-svh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 ring-0 sm:max-w-none"
                >
                    <div className="flex h-12 shrink-0 items-center gap-3 bg-foreground px-4 text-background">
                        <KindIcon aria-hidden="true" className="size-4 shrink-0 opacity-70" />
                        <div className="flex min-w-0 items-baseline gap-2">
                            <DialogTitle className="truncate text-sm font-semibold">{title}</DialogTitle>
                            <DialogDescription className="hidden truncate text-xs text-background/60 sm:block">
                                {reference} · {kind.label}
                            </DialogDescription>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-background hover:bg-background/10 hover:text-background"
                                asChild
                            >
                                <a href={preview.open_url} target={isDownload ? undefined : '_blank'} rel="noreferrer">
                                    {isDownload ? (
                                        <DownloadIcon data-icon="inline-start" aria-hidden="true" />
                                    ) : (
                                        <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
                                    )}
                                    {isDownload ? 'Download' : 'Open in new tab'}
                                </a>
                            </Button>
                            <DialogClose asChild>
                                <Button variant="secondary" size="sm">
                                    Close
                                </Button>
                            </DialogClose>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 bg-muted p-0 sm:p-4">
                        <div className="mx-auto size-full max-w-6xl overflow-hidden bg-background sm:rounded-md sm:ring-1 sm:ring-foreground/10">
                            {fullView && (
                                <PreviewSurface preview={preview} title={title} onOfficeError={handleOfficeError} />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
