import FieldError from '@/Components/FieldError';
import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, FileIcon, LinkIcon, PaperclipIcon, UploadIcon, XIcon } from 'lucide-react';
import { useRef } from 'react';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function formatSize(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// The "Attach" menu: a Google Workspace link, or a file from this device.
function AttachMenu({ onLink, onUpload, children }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="w-72 p-1.5">
                <DropdownMenuItem onSelect={onLink} className="items-start gap-3 px-2.5 py-2">
                    <LinkIcon aria-hidden="true" className="mt-0.5" />
                    <span className="grid gap-0.5">
                        <span className="font-medium">Google Workspace link</span>
                        <span className="text-xs text-muted-foreground">Docs, Sheets or Slides on docs.google.com</span>
                    </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onUpload} className="items-start gap-3 px-2.5 py-2">
                    <UploadIcon aria-hidden="true" className="mt-0.5" />
                    <span className="grid gap-0.5">
                        <span className="font-medium">Upload from this device</span>
                        <span className="text-xs text-muted-foreground">PDF, DOCX or XLSX, up to 10 MB</span>
                    </span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Google Workspace link OR one file upload, picked from an "Attach" menu.
 * Expects the useForm() fields source_type ('' until something is attached,
 * then 'link' or 'file'), google_workspace_link and file. Used by submit and
 * resubmit.
 */
export default function DocumentSourceField({ form, label = 'File' }) {
    const { data, setData, errors, setError, clearErrors } = form;
    const fileInput = useRef(null);
    const error = errors.source_type ?? errors.google_workspace_link ?? errors.file;

    function attachLink() {
        clearErrors('source_type', 'google_workspace_link', 'file');
        setData((current) => ({ ...current, source_type: 'link', file: null }));
        // Focus the link box once it has rendered (after the menu closes).
        setTimeout(() => document.getElementById('google_workspace_link')?.focus(), 50);
    }

    function chooseFile(event) {
        const file = event.target.files[0] ?? null;
        event.target.value = '';
        if (!file) return;

        clearErrors('source_type', 'google_workspace_link', 'file');
        if (file.size > MAX_FILE_BYTES) {
            setError('file', 'The file must be 10 MB or smaller.');
            return;
        }
        setData((current) => ({ ...current, source_type: 'file', file }));
    }

    function remove() {
        clearErrors('source_type', 'google_workspace_link', 'file');
        setData((current) => ({ ...current, source_type: '', google_workspace_link: '', file: null }));
    }

    const menu = (trigger) => (
        <AttachMenu onLink={attachLink} onUpload={() => fileInput.current?.click()}>
            {trigger}
        </AttachMenu>
    );

    return (
        <div className="grid gap-2">
            <Label htmlFor={data.source_type === 'link' ? 'google_workspace_link' : 'attach'}>{label}</Label>

            <input
                ref={fileInput}
                id="file"
                type="file"
                accept=".pdf,.docx,.xlsx"
                onChange={chooseFile}
                className="sr-only"
                tabIndex={-1}
                aria-label="Upload from this device"
            />

            {data.source_type === 'link' && (
                <div className="flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                        <LinkIcon
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            id="google_workspace_link"
                            type="url"
                            placeholder="https://docs.google.com/..."
                            value={data.google_workspace_link}
                            onChange={(e) => setData('google_workspace_link', e.target.value)}
                            aria-invalid={!!error}
                            className="pl-8"
                        />
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove link" onClick={remove}>
                        <XIcon aria-hidden="true" />
                    </Button>
                </div>
            )}

            {data.source_type === 'file' && data.file && (
                <div
                    className={cn(
                        'flex items-center gap-3 rounded-lg border bg-muted/30 py-2 pr-1.5 pl-3',
                        error && 'border-destructive',
                    )}
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border">
                        <FileIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{data.file.name}</span>
                        <span className="block text-xs text-muted-foreground">{formatSize(data.file.size)}</span>
                    </span>
                    {menu(
                        <Button type="button" variant="ghost" size="sm">
                            Change
                        </Button>,
                    )}
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onClick={remove}>
                        <XIcon aria-hidden="true" />
                    </Button>
                </div>
            )}

            {(data.source_type === '' || (data.source_type === 'file' && !data.file)) &&
                menu(
                    <button
                        id="attach"
                        type="button"
                        aria-invalid={!!error}
                        className={cn(
                            'group flex h-11 w-full items-center gap-3 rounded-lg border border-dashed px-3 text-left text-sm transition-colors hover:border-foreground/30 hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-[state=open]:border-foreground/30 data-[state=open]:bg-muted/40',
                            error && 'border-destructive',
                        )}
                    >
                        <PaperclipIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                        <span className="flex-1 text-muted-foreground">Attach a Google Workspace link or a file</span>
                        <ChevronDownIcon
                            aria-hidden="true"
                            className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                        />
                    </button>,
                )}

            <FieldError message={error} />
        </div>
    );
}

// Send only the source that was chosen.
export function onlyChosenSource(form) {
    return form.source_type === 'link'
        ? { ...form, file: null }
        : { ...form, google_workspace_link: '' };
}
