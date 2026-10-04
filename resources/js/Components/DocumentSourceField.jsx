import FieldError from '@/Components/FieldError';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { cn } from '@/lib/utils';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SOURCE_OPTIONS = [
    { value: 'link', label: 'Google Workspace link', icon: 'link' },
    { value: 'file', label: 'Upload a file', icon: 'upload_file' },
];

/**
 * Google Workspace link OR one file upload. Expects the useForm() fields
 * source_type, google_workspace_link and file. Used by submit and resubmit.
 */
export default function DocumentSourceField({ form, label = 'Document' }) {
    const { data, setData, errors, setError, clearErrors } = form;

    function chooseFile(event) {
        const file = event.target.files[0] ?? null;
        clearErrors('file');

        if (file && file.size > MAX_FILE_BYTES) {
            setError('file', 'The file must be 10 MB or smaller.');
            event.target.value = '';
            setData('file', null);
            return;
        }

        setData('file', file);
    }

    return (
        <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {SOURCE_OPTIONS.map((option) => {
                    const selected = data.source_type === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                                setData('source_type', option.value);
                                clearErrors('google_workspace_link', 'file');
                            }}
                            className={cn(
                                'flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                selected
                                    ? 'border-dost-blue text-dost-blue'
                                    : 'border-border text-ink-muted hover:text-ink',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-[20px] leading-none"
                            >
                                {option.icon}
                            </span>
                            {option.label}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3">
                {data.source_type === 'link' ? (
                    <>
                        <Label htmlFor="google_workspace_link" className="sr-only">
                            Google Workspace link
                        </Label>
                        <Input
                            id="google_workspace_link"
                            type="url"
                            placeholder="https://docs.google.com/..."
                            value={data.google_workspace_link}
                            onChange={(e) => setData('google_workspace_link', e.target.value)}
                            aria-invalid={!!errors.google_workspace_link}
                        />
                        <p className="mt-1.5 text-sm text-ink-muted">
                            A docs.google.com link (Docs, Sheets or Slides).
                        </p>
                        <FieldError message={errors.google_workspace_link} />
                    </>
                ) : (
                    <>
                        <label
                            htmlFor="file"
                            className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-4 transition-colors hover:border-dost-blue',
                                errors.file ? 'border-stamp-rust' : 'border-border',
                            )}
                        >
                            <span aria-hidden="true" className="material-symbols-outlined text-ink-muted">
                                upload_file
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-ink">
                                    {data.file ? data.file.name : 'Choose a file'}
                                </span>
                                <span className="block text-sm text-ink-muted">
                                    PDF, DOCX or XLSX, up to 10 MB
                                </span>
                            </span>
                        </label>
                        <input
                            id="file"
                            type="file"
                            accept=".pdf,.docx,.xlsx"
                            onChange={chooseFile}
                            className="sr-only"
                        />
                        <FieldError message={errors.file} />
                    </>
                )}
            </div>
        </fieldset>
    );
}

// Send only the source that was chosen.
export function onlyChosenSource(form) {
    return form.source_type === 'link'
        ? { ...form, file: null }
        : { ...form, google_workspace_link: '' };
}
