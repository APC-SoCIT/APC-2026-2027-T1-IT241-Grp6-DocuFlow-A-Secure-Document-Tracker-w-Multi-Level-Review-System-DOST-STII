import OfficePreview from '@/Components/OfficePreview';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import {
    CircleAlertIcon,
    DownloadIcon,
    ExternalLinkIcon,
    FileIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    LinkIcon,
} from 'lucide-react';
import { useCallback, useState } from 'react';

const FILE_LABELS = {
    docx: { label: 'Word document (.docx)', icon: FileTextIcon },
    xlsx: { label: 'Excel spreadsheet (.xlsx)', icon: FileSpreadsheetIcon },
};

function PreviewBar({ children }) {
    return (
        <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-medium">Document preview</span>
            {children}
        </div>
    );
}

/**
 * Left-hand preview panel: Google Workspace links via their /preview URL,
 * PDFs natively in an iframe, .docx/.xlsx rendered in the browser, with a
 * file card + Open as the fallback.
 */
export default function DocumentPreview({ preview, title }) {
    const [officeFailed, setOfficeFailed] = useState(false);
    const handleOfficeError = useCallback(() => setOfficeFailed(true), []);

    const embedUrl = preview.kind === 'google' ? preview.embed_url : preview.kind === 'pdf' ? preview.open_url : null;
    const canRenderOffice =
        preview.kind === 'file' && ['docx', 'xlsx'].includes(preview.extension) && !officeFailed;

    if (preview.kind === 'missing') {
        return (
            <Card className="min-h-120 items-center justify-center p-8">
                <div role="alert" className="flex max-w-sm flex-col items-center text-center">
                    <CircleAlertIcon aria-hidden="true" className="size-10 text-destructive" />
                    <p className="mt-3 font-medium">The uploaded file is unavailable</p>
                    <p className="mt-1 text-muted-foreground">
                        The document's details, remarks and history below are still available.
                    </p>
                </div>
            </Card>
        );
    }

    if (canRenderOffice) {
        return (
            <Card className="h-[75vh] min-h-120 gap-0 py-0">
                <PreviewBar>
                    <Button variant="ghost" size="sm" asChild>
                        <a href={preview.open_url}>
                            <DownloadIcon data-icon="inline-start" aria-hidden="true" />
                            Download
                        </a>
                    </Button>
                </PreviewBar>
                <div className="min-h-0 flex-1 overflow-auto bg-card">
                    <OfficePreview
                        extension={preview.extension}
                        url={preview.open_url}
                        onError={handleOfficeError}
                    />
                </div>
            </Card>
        );
    }

    if (embedUrl) {
        return (
            <Card className="h-[75vh] min-h-120 gap-0 py-0">
                <PreviewBar>
                    <Button variant="ghost" size="sm" asChild>
                        <a href={preview.open_url} target="_blank" rel="noreferrer">
                            <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
                            Open in new tab
                        </a>
                    </Button>
                </PreviewBar>
                <iframe src={embedUrl} title={`Preview of ${title}`} className="w-full flex-1 bg-card" />
            </Card>
        );
    }

    const file = FILE_LABELS[preview.extension];
    const Icon = preview.kind === 'google' ? LinkIcon : (file?.icon ?? FileIcon);

    return (
        <Card className="min-h-120 items-center justify-center p-8">
            <div className="flex max-w-sm flex-col items-center text-center">
                <Icon aria-hidden="true" className="size-10 text-muted-foreground" />
                <p className="mt-3 font-medium">
                    {preview.kind === 'google' ? 'Google Workspace link' : (file?.label ?? 'Uploaded file')}
                </p>
                <p className="mt-1 text-muted-foreground">
                    {preview.kind === 'google'
                        ? "This link can't be previewed here."
                        : "This file couldn't be previewed here. Open it to read it."}
                </p>
                <Button variant="outline" className="mt-5" asChild>
                    <a
                        href={preview.open_url}
                        target={preview.kind === 'file' ? undefined : '_blank'}
                        rel="noreferrer"
                    >
                        Open
                        {preview.kind === 'file' ? (
                            <DownloadIcon data-icon="inline-end" aria-hidden="true" />
                        ) : (
                            <ExternalLinkIcon data-icon="inline-end" aria-hidden="true" />
                        )}
                    </a>
                </Button>
            </div>
        </Card>
    );
}
