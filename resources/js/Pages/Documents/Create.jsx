import DocumentSourceField, { onlyChosenSource } from '@/Components/DocumentSourceField';
import FieldError from '@/Components/FieldError';
import SubmitButton from '@/Components/SubmitButton';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { ReviewerOption, dropdownProps, optionClassName } from '@/Components/SelectOptions';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const FORM_ID = 'submit-document-form';
const DESCRIPTION_MAX = 2000;

// The current time, refreshed every 30 seconds, for the read-only Date Submitted.
function useNow() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(timer);
    }, []);
    return now;
}

function Optional() {
    return <span className="text-xs font-normal text-muted-foreground">Optional</span>;
}

export default function Create({ documentTypes, l1Reviewers }) {
    const form = useForm({
        document_type: '',
        document_type_other: '',
        description: '',
        source_type: '', // '' until a link or file is attached
        google_workspace_link: '',
        file: null,
        l1_reviewer_id: '',
    });
    const { data, setData, post, processing, progress, errors, transform } = form;
    const now = useNow();
    const isOther = data.document_type === 'Other';

    function submit(event) {
        event.preventDefault();
        transform((values) => onlyChosenSource(values));
        post(route('documents.store'), { forceFormData: true });
    }

    return (
        <AuthenticatedLayout
            title="Submit document"
            back={{ fallback: route('documents.index') }}
            surface
            actions={
                <>
                    <Button variant="outline" onClick={() => goBack(route('documents.index'))}>
                        Cancel
                    </Button>
                    <SubmitButton form={FORM_ID} processing={processing} progress={progress} busyLabel="Submitting…">
                        Submit
                    </SubmitButton>
                </>
            }
        >
            <Head title="Submit document" />

            <form
                id={FORM_ID}
                onSubmit={submit}
                noValidate
                className="grid gap-x-12 gap-y-10 lg:grid-cols-2"
            >
                <section className="grid content-start gap-5">
                    <h2 className="text-sm font-semibold">Document</h2>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className={isOther ? 'grid content-start gap-2' : 'grid content-start gap-2 sm:col-span-2'}>
                            <Label htmlFor="document_type">Document type</Label>
                            <Select value={data.document_type} onValueChange={(value) => setData('document_type', value)}>
                                <SelectTrigger id="document_type" className="w-full" aria-invalid={!!errors.document_type}>
                                    <SelectValue placeholder="Select a document type" />
                                </SelectTrigger>
                                <SelectContent {...dropdownProps}>
                                    {documentTypes.map((type) => (
                                        <SelectItem key={type} value={type} className={optionClassName}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.document_type} />
                        </div>

                        {isOther && (
                            <div className="grid content-start gap-2">
                                <Label htmlFor="document_type_other">Specify the document type</Label>
                                <Input
                                    id="document_type_other"
                                    value={data.document_type_other}
                                    maxLength={100}
                                    autoFocus
                                    onChange={(e) => setData('document_type_other', e.target.value)}
                                    aria-invalid={!!errors.document_type_other}
                                    placeholder="e.g. Equipment Inventory"
                                />
                                <FieldError message={errors.document_type_other} />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="description">
                                Description <Optional />
                            </Label>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {data.description.length}/{DESCRIPTION_MAX}
                            </span>
                        </div>
                        <Textarea
                            id="description"
                            rows={6}
                            value={data.description}
                            maxLength={DESCRIPTION_MAX}
                            onChange={(e) => setData('description', e.target.value)}
                            aria-invalid={!!errors.description}
                            placeholder="A short summary for your reviewers"
                        />
                        <FieldError message={errors.description} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="date_submitted">Date Submitted</Label>
                        <Input
                            id="date_submitted"
                            readOnly
                            tabIndex={-1}
                            value={formatDateTime(now)}
                            className="bg-muted/50 text-muted-foreground"
                        />
                    </div>

                    <DocumentSourceField form={form} label="File" />
                </section>

                <div className="grid content-start gap-10">
                    <section className="grid content-start gap-5">
                        <h2 className="text-sm font-semibold">Reviewer</h2>
                        <div className="grid gap-2">
                            <Label htmlFor="l1_reviewer_id">Immediate Supervisor (L1)</Label>
                            <Select value={data.l1_reviewer_id} onValueChange={(value) => setData('l1_reviewer_id', value)}>
                                <SelectTrigger id="l1_reviewer_id" className="w-full" aria-invalid={!!errors.l1_reviewer_id}>
                                    <SelectValue placeholder="Select a reviewer" />
                                </SelectTrigger>
                                <SelectContent {...dropdownProps}>
                                    <SelectGroup>
                                        <SelectLabel>Immediate Supervisors (L1)</SelectLabel>
                                        {l1Reviewers.map((reviewer) => (
                                            <SelectItem key={reviewer.id} value={String(reviewer.id)} className={optionClassName}>
                                                <ReviewerOption name={reviewer.name} />
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.l1_reviewer_id} />
                        </div>
                    </section>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
