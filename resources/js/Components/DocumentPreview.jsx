import OfficePreview from '@/Components/OfficePreview';
import { buttonVariants } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { useCallback, useState } from 'react';

const FILE_LABELS = {
    docx: { label: 'Word document (.docx)', icon: 'article' },
    xlsx: { label: 'Excel spreadsheet (.xlsx)', icon: 'table_chart' },
};

function OpenLink({ href, children = 'Open', download = false }) {
    return (
        <a
            href={href}
            target={download ? undefined : '_blank'}
            rel="noreferrer"
            className={buttonVariants({ variant: 'outlined' })}
        >
            {children}
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] leading-none">
                {download ? 'download' : 'open_in_new'}
            </span>
        </a>
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

    if (canRenderOffice) {
        return (
            <Card className="flex h-[75vh] min-h-[480px] flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                    <span className="text-sm font-medium text-ink">Document preview</span>
                    <a href={preview.open_url} className={buttonVariants({ variant: 'text' })}>
                        Download
                    </a>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-white">
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
            <Card className="flex h-[75vh] min-h-[480px] flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                    <span className="text-sm font-medium text-ink">Document preview</span>
                    <a
                        href={preview.open_url}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: 'text' })}
                    >
                        Open in new tab
                    </a>
                </div>
                <iframe src={embedUrl} title={`Preview of ${title}`} className="w-full flex-1 bg-white" />
            </Card>
        );
    }

    const file = FILE_LABELS[preview.extension];

    return (
        <Card className="flex min-h-[480px] items-center justify-center p-8">
            <div className="flex max-w-sm flex-col items-center text-center">
                <span aria-hidden="true" className="material-symbols-outlined text-[48px] text-ink-muted">
                    {preview.kind === 'google' ? 'link' : (file?.icon ?? 'draft')}
                </span>
                <p className="mt-3 text-sm font-medium text-ink">
                    {preview.kind === 'google' ? 'Google Workspace link' : (file?.label ?? 'Uploaded file')}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                    {preview.kind === 'google'
                        ? "This link can't be previewed here."
                        : "This file couldn't be previewed here. Open it to read it."}
                </p>
                <div className="mt-5">
                    <OpenLink href={preview.open_url} download={preview.kind === 'file'} />
                </div>
            </div>
        </Card>
    );
}
