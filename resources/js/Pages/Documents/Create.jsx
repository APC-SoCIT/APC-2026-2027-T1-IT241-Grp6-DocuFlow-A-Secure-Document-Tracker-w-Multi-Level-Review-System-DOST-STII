import DocumentSourceField, { onlyChosenSource } from '@/Components/DocumentSourceField';
import FieldError from '@/Components/FieldError';
import { Button, buttonVariants } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { NativeSelect } from '@/Components/ui/native-select';
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
    const { data, setData, post, processing, errors, transform } = form;

    function submit(event) {
        event.preventDefault();
        transform(onlyChosenSource);
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

                            <DocumentSourceField form={form} />

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
