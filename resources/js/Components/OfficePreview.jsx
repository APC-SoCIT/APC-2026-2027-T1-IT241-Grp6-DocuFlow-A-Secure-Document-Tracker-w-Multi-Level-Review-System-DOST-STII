import { Skeleton } from '@/Components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { useEffect, useRef, useState } from 'react';

// Rows rendered per sheet; enough to review, keeps huge sheets responsive.
const MAX_ROWS = 500;

async function fetchFile(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.arrayBuffer();
}

function PreviewSkeleton() {
    return (
        <div className="space-y-3 p-6" aria-label="Loading preview">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    );
}

function WordPreview({ url, onError }) {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [{ renderAsync }, buffer] = await Promise.all([
                    import('docx-preview'),
                    fetchFile(url),
                ]);
                if (cancelled) return;
                await renderAsync(buffer, containerRef.current, null, {
                    inWrapper: true,
                    ignoreLastRenderedPageBreak: true,
                });
            } catch (error) {
                if (!cancelled) onError(error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [url, onError]);

    return (
        <>
            {loading && <PreviewSkeleton />}
            <div ref={containerRef} className="docx-preview-host" />
        </>
    );
}

function SpreadsheetPreview({ url, onError }) {
    const [sheets, setSheets] = useState(null);
    const [active, setActive] = useState(0);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [XLSX, buffer] = await Promise.all([import('xlsx'), fetchFile(url)]);
                if (cancelled) return;
                const workbook = XLSX.read(buffer);
                setSheets(
                    workbook.SheetNames.map((name) => ({
                        name,
                        // Formatted cell text as rows; rendered as plain text by React.
                        rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
                            header: 1,
                            raw: false,
                            defval: '',
                            blankrows: false,
                        }),
                    })),
                );
            } catch (error) {
                if (!cancelled) onError(error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [url, onError]);

    if (!sheets) {
        return <PreviewSkeleton />;
    }

    const sheet = sheets[active];
    const columnCount = Math.max(1, ...sheet.rows.map((row) => row.length));

    return (
        <div className="flex h-full flex-col">
            {sheets.length > 1 && (
                <div className="overflow-x-auto border-b px-2 py-2">
                    <Tabs value={String(active)} onValueChange={(value) => setActive(Number(value))}>
                        <TabsList>
                            {sheets.map((s, index) => (
                                <TabsTrigger key={s.name} value={String(index)}>
                                    {s.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                {sheet.rows.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">This sheet is empty.</p>
                ) : (
                    <table className="border-collapse text-sm">
                        <tbody>
                            {sheet.rows.slice(0, MAX_ROWS).map((row, r) => (
                                <tr key={r}>
                                    <th className="sticky left-0 border bg-muted px-2 py-1 text-right text-xs font-medium text-muted-foreground">
                                        {r + 1}
                                    </th>
                                    {Array.from({ length: columnCount }, (_, c) => (
                                        <td
                                            key={c}
                                            className="border px-2 py-1 whitespace-nowrap"
                                        >
                                            {row[c] ?? ''}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {sheet.rows.length > MAX_ROWS && (
                    <p className="p-4 text-sm text-muted-foreground">
                        Showing the first {MAX_ROWS} of {sheet.rows.length} rows. Open the file to see the rest.
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * In-browser preview of an uploaded .docx (docx-preview) or .xlsx (SheetJS).
 * Calls onError if the file can't be read, so the caller can fall back.
 */
export default function OfficePreview({ extension, url, onError }) {
    return extension === 'xlsx' ? (
        <SpreadsheetPreview url={url} onError={onError} />
    ) : (
        <WordPreview url={url} onError={onError} />
    );
}
