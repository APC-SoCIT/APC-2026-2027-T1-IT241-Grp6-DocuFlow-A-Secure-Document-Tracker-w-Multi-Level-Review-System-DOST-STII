import DocumentSourceField, { onlyChosenSource } from '@/Components/DocumentSourceField';
import FieldError from '@/Components/FieldError';
import FormSection from '@/Components/FormSection';
import SubmitButton from '@/Components/SubmitButton';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { DocumentTypeOption, ReviewerOption, dropdownProps, optionClassName } from '@/Components/SelectOptions';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { Head, useForm } from '@inertiajs/react';
import { CalendarClockIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

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
        source_type: 'link',
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
            description="It gets a reference number when you submit it and goes to the Immediate Supervisor (L1) you choose."
            back={{ fallback: route('documents.index') }}
        >
            <Head title="Submit document" />

            <Card className="max-w-4xl gap-0 py-0">
                <form onSubmit={submit} noValidate className="contents">
                    <div className="divide-y">
                        <FormSection title="Document" description="What you're submitting for review.">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid content-start gap-2">
                                    <Label htmlFor="document_type">Document type</Label>
                                    <Select
                                        value={data.document_type}
                                        onValueChange={(value) => setData('document_type', value)}
                                    >
                                        <SelectTrigger
                                            id="document_type"
                                            className="w-full"
                                            aria-invalid={!!errors.document_type}
                                        >
                                            <SelectValue placeholder="Select a document type" />
                                        </SelectTrigger>
                                        <SelectContent {...dropdownProps}>
                                            {documentTypes.map((type) => (
                                                <SelectItem key={type} value={type} className={optionClassName}>
                                                    <DocumentTypeOption type={type} />
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
                                    rows={3}
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
                                <div className="relative">
                                    <CalendarClockIcon
                                        aria-hidden="true"
                                        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <Input
                                        id="date_submitted"
                                        readOnly
                                        tabIndex={-1}
                                        value={formatDateTime(now)}
                                        aria-describedby="date_submitted_help"
                                        className="bg-muted/50 pl-8 text-muted-foreground"
                                    />
                                </div>
                                <p id="date_submitted_help" className="text-xs text-muted-foreground">
                                    Set by the system when you submit. It stays the same if the document is resubmitted.
                                </p>
                            </div>
                        </FormSection>

                        <FormSection title="File" description="A Google Workspace link, or one PDF, DOCX or XLSX file.">
                            <DocumentSourceField form={form} label="Source" />
                        </FormSection>

                        <FormSection title="Routing" description="The first reviewer. They can forward it to a Section Head (L2).">
                            <div className="grid gap-2">
                                <Label htmlFor="l1_reviewer_id">Immediate Supervisor (L1)</Label>
                                <Select
                                    value={data.l1_reviewer_id}
                                    onValueChange={(value) => setData('l1_reviewer_id', value)}
                                >
                                    <SelectTrigger
                                        id="l1_reviewer_id"
                                        className="w-full sm:w-1/2"
                                        aria-invalid={!!errors.l1_reviewer_id}
                                    >
                                        <SelectValue placeholder="Select a reviewer" />
                                    </SelectTrigger>
                                    <SelectContent {...dropdownProps}>
                                        <SelectGroup>
                                            <SelectLabel>Immediate Supervisors (L1)</SelectLabel>
                                            {l1Reviewers.map((reviewer) => (
                                                <SelectItem
                                                    key={reviewer.id}
                                                    value={String(reviewer.id)}
                                                    className={optionClassName}
                                                >
                                                    <ReviewerOption name={reviewer.name} />
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError message={errors.l1_reviewer_id} />
                            </div>
                        </FormSection>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3">
                        <Button variant="outline" onClick={() => goBack(route('documents.index'))}>
                            Cancel
                        </Button>
                        <SubmitButton processing={processing} progress={progress} busyLabel="Submitting…">
                            Submit document
                        </SubmitButton>
                    </div>
                </form>
            </Card>
        </AuthenticatedLayout>
    );
}
