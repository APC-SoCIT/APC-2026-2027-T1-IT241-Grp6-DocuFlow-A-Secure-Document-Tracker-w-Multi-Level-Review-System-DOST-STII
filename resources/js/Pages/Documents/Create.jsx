import DocumentSourceField, { onlyChosenSource } from '@/Components/DocumentSourceField';
import FieldError from '@/Components/FieldError';
import SubmitButton from '@/Components/SubmitButton';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create({ documentTypes, l1Reviewers }) {
    const form = useForm({
        document_type: '',
        source_type: 'link',
        google_workspace_link: '',
        file: null,
        l1_reviewer_id: '',
    });
    const { data, setData, post, processing, progress, errors, transform } = form;

    function submit(event) {
        event.preventDefault();
        transform(onlyChosenSource);
        post(route('documents.store'), { forceFormData: true });
    }

    return (
        <AuthenticatedLayout title="Submit document">
            <Head title="Submit document" />

            <Card className="max-w-2xl">
                <form onSubmit={submit} noValidate className="contents">
                    <CardHeader>
                        <CardTitle>New document</CardTitle>
                        <CardDescription>
                            It gets a reference number when you submit it and goes to the
                            Immediate Supervisor (L1) you choose.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
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
                                <SelectContent>
                                    {documentTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.document_type} />
                        </div>

                        <DocumentSourceField form={form} />

                        <div className="grid gap-2">
                            <Label htmlFor="l1_reviewer_id">Immediate Supervisor (L1)</Label>
                            <Select
                                value={data.l1_reviewer_id}
                                onValueChange={(value) => setData('l1_reviewer_id', value)}
                            >
                                <SelectTrigger
                                    id="l1_reviewer_id"
                                    className="w-full"
                                    aria-invalid={!!errors.l1_reviewer_id}
                                >
                                    <SelectValue placeholder="Select a reviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {l1Reviewers.map((reviewer) => (
                                        <SelectItem key={reviewer.id} value={String(reviewer.id)}>
                                            {reviewer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.l1_reviewer_id} />
                        </div>
                    </CardContent>

                    <CardFooter className="justify-end gap-3">
                        <Button variant="outline" asChild>
                            <Link href={route('documents.index')}>Cancel</Link>
                        </Button>
                        <SubmitButton processing={processing} progress={progress} busyLabel="Submitting…">
                            Submit document
                        </SubmitButton>
                    </CardFooter>
                </form>
            </Card>
        </AuthenticatedLayout>
    );
}
