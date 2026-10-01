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
            {loading && <p className="p-6 text-sm text-ink-muted">Loading preview…</p>}
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
        return <p className="p-6 text-sm text-ink-muted">Loading preview…</p>;
    }

    const sheet = sheets[active];
    const columnCount = Math.max(1, ...sheet.rows.map((row) => row.length));

    return (
        <div className="flex h-full flex-col">
            {sheets.length > 1 && (
                <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
                    {sheets.map((s, index) => (
                        <button
                            key={s.name}
                            type="button"
                            onClick={() => setActive(index)}
                            className={
                                index === active
                                    ? 'whitespace-nowrap rounded-md bg-dost-blue px-3 py-1 text-sm font-medium text-white'
                                    : 'whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium text-ink-muted hover:bg-paper hover:text-ink'
                            }
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 overflow-auto">
                {sheet.rows.length === 0 ? (
                    <p className="p-6 text-sm text-ink-muted">This sheet is empty.</p>
                ) : (
                    <table className="border-collapse text-sm text-ink">
                        <tbody>
                            {sheet.rows.slice(0, MAX_ROWS).map((row, r) => (
                                <tr key={r}>
                                    <th className="sticky left-0 border border-border bg-paper-dim px-2 py-1 text-right text-xs font-medium text-ink-muted">
                                        {r + 1}
                                    </th>
                                    {Array.from({ length: columnCount }, (_, c) => (
                                        <td
                                            key={c}
                                            className="whitespace-nowrap border border-border px-2 py-1"
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
                    <p className="p-4 text-sm text-ink-muted">
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
