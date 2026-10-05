import FieldError from '@/Components/FieldError';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/Components/ui/radio-group';
import { cn } from '@/lib/utils';
import { UploadIcon } from 'lucide-react';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SOURCE_OPTIONS = [
    { value: 'link', label: 'Google Workspace link' },
    { value: 'file', label: 'Upload a file' },
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
        <fieldset className="grid gap-3">
            <legend className="mb-3 text-sm font-semibold">{label}</legend>

            <RadioGroup
                value={data.source_type}
                onValueChange={(value) => {
                    setData('source_type', value);
                    clearErrors('google_workspace_link', 'file');
                }}
                className="grid-cols-2"
            >
                {SOURCE_OPTIONS.map((option) => (
                    <Label
                        key={option.value}
                        htmlFor={`source-${option.value}`}
                        className="cursor-pointer rounded-lg border p-3 font-normal has-data-checked:border-primary has-data-checked:bg-muted/50"
                    >
                        <RadioGroupItem id={`source-${option.value}`} value={option.value} />
                        {option.label}
                    </Label>
                ))}
            </RadioGroup>

            {data.source_type === 'link' ? (
                <div className="grid gap-2">
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
                    <FieldError message={errors.google_workspace_link} />
                </div>
            ) : (
                <div className="grid gap-2">
                    <label
                        htmlFor="file"
                        className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors hover:border-primary hover:bg-muted/50 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                            errors.file && 'border-destructive',
                        )}
                    >
                        <UploadIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                                {data.file ? data.file.name : 'Choose a file'}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                                PDF, DOCX or XLSX, up to 10 MB
                            </span>
                        </span>
                        <input
                            id="file"
                            type="file"
                            accept=".pdf,.docx,.xlsx"
                            onChange={chooseFile}
                            className="sr-only"
                        />
                    </label>
                    <FieldError message={errors.file} />
                </div>
            )}
        </fieldset>
    );
}

// Send only the source that was chosen.
export function onlyChosenSource(form) {
    return form.source_type === 'link'
        ? { ...form, file: null }
        : { ...form, google_workspace_link: '' };
}
