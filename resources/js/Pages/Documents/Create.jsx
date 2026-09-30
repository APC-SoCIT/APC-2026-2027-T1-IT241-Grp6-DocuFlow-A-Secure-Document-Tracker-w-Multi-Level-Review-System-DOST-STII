import { Button, buttonVariants } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { NativeSelect } from '@/Components/ui/native-select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SOURCE_OPTIONS = [
    { value: 'link', label: 'Google Workspace link', icon: 'link' },
    { value: 'file', label: 'Upload a file', icon: 'upload_file' },
];

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-sm text-stamp-rust">{message}</p>;
}

export default function Create({ documentTypes, l1Reviewers }) {
    const { data, setData, post, processing, errors, setError, clearErrors, transform } =
        useForm({
            document_type: '',
            source_type: 'link',
            google_workspace_link: '',
            file: null,
            l1_reviewer_id: '',
        });

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

    function submit(event) {
        event.preventDefault();

        // Send only the source that was chosen.
        transform((form) =>
            form.source_type === 'link'
                ? { ...form, file: null }
                : { ...form, google_workspace_link: '' },
        );

        post(route('documents.store'), { forceFormData: true });
    }

    return (
        <AuthenticatedLayout
            header={<h1 className="text-2xl font-medium text-ink">Submit document</h1>}
        >
            <Head title="Submit document" />

            <div className="px-8 py-6">
                <Card className="max-w-2xl">
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6" noValidate>
                            <div>
                                <Label htmlFor="document_type">Document type</Label>
                                <NativeSelect
                                    id="document_type"
                                    value={data.document_type}
                                    onChange={(e) => setData('document_type', e.target.value)}
                                    aria-invalid={!!errors.document_type}
                                    required
                                >
                                    <option value="" disabled>
                                        Select a document type
                                    </option>
                                    {documentTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </NativeSelect>
                                <FieldError message={errors.document_type} />
                            </div>

                            <fieldset>
                                <legend className="mb-1.5 text-sm font-medium text-ink">
                                    Document
                                </legend>
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
                                                onChange={(e) =>
                                                    setData('google_workspace_link', e.target.value)
                                                }
                                                aria-invalid={!!errors.google_workspace_link}
                                            />
                                            <p className="mt-1.5 text-sm text-ink-muted">
                                                A docs.google.com or drive.google.com link.
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
                                                <span
                                                    aria-hidden="true"
                                                    className="material-symbols-outlined text-ink-muted"
                                                >
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

                            <div>
                                <Label htmlFor="l1_reviewer_id">Immediate Supervisor (L1)</Label>
                                <NativeSelect
                                    id="l1_reviewer_id"
                                    value={data.l1_reviewer_id}
                                    onChange={(e) => setData('l1_reviewer_id', e.target.value)}
                                    aria-invalid={!!errors.l1_reviewer_id}
                                    required
                                >
                                    <option value="" disabled>
                                        Select a reviewer
                                    </option>
                                    {l1Reviewers.map((reviewer) => (
                                        <option key={reviewer.id} value={reviewer.id}>
                                            {reviewer.name}
                                        </option>
                                    ))}
                                </NativeSelect>
                                <FieldError message={errors.l1_reviewer_id} />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-border pt-6">
                                <Link
                                    href={route('documents.index')}
                                    className={buttonVariants({ variant: 'outlined' })}
                                >
                                    Cancel
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    Submit document
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
