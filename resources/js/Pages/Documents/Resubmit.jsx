import DocumentSourceField, { onlyChosenSource } from '@/Components/DocumentSourceField';
import FieldError from '@/Components/FieldError';
import { Button, buttonVariants } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Resubmit({ document }) {
    const form = useForm({
        // Start from the current source; an edited Google Doc keeps its link.
        source_type: document.has_file ? 'file' : 'link',
        google_workspace_link: document.google_workspace_link ?? '',
        file: null,
        change_note: '',
    });
    const { data, setData, post, processing, errors, transform } = form;

    function submit(event) {
        event.preventDefault();
        transform(onlyChosenSource);
        post(route('documents.resubmit', document.id), { forceFormData: true });
    }

    return (
        <AuthenticatedLayout
            header={
                <h1 className="text-2xl font-medium text-ink">
                    Resubmit {document.reference_number}
                </h1>
            }
        >
            <Head title={`Resubmit ${document.reference_number}`} />

            <div className="px-8 py-6">
                <Card className="max-w-2xl">
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6" noValidate>
                            <DocumentSourceField form={form} label="Updated document" />

                            <div>
                                <Label htmlFor="change_note">Change note</Label>
                                <Textarea
                                    id="change_note"
                                    value={data.change_note}
                                    onChange={(e) => setData('change_note', e.target.value)}
                                    placeholder="What did you change in response to the reviewer's remarks?"
                                    aria-invalid={!!errors.change_note}
                                    required
                                />
                                <FieldError message={errors.change_note} />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-border pt-6">
                                <Link
                                    href={route('documents.show', document.id)}
                                    className={buttonVariants({ variant: 'outlined' })}
                                >
                                    Cancel
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    Resubmit
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
