import DocumentSourceField, { onlyChosenSource } from '@/Components/DocumentSourceField';
import FieldError from '@/Components/FieldError';
import ReturnNotice from '@/Components/ReturnNotice';
import SubmitButton from '@/Components/SubmitButton';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Resubmit({ document, lastReturn }) {
    const form = useForm({
        // Start from the current source; an edited Google Doc keeps its link.
        source_type: document.has_file ? 'file' : 'link',
        google_workspace_link: document.google_workspace_link ?? '',
        file: null,
        change_note: '',
    });
    const { data, setData, post, processing, progress, errors, transform } = form;

    function submit(event) {
        event.preventDefault();
        transform(onlyChosenSource);
        post(route('documents.resubmit', document.id), { forceFormData: true });
    }

    return (
        <AuthenticatedLayout title={`Resubmit ${document.reference_number}`}>
            <Head title={`Resubmit ${document.reference_number}`} />

            <div className="max-w-2xl space-y-6">
                {lastReturn && <ReturnNotice lastReturn={lastReturn} />}

                <Card>
                    <form onSubmit={submit} noValidate className="contents">
                        <CardHeader>
                            <CardTitle>New revision</CardTitle>
                            <CardDescription>
                                Same reference number. It goes back to the Immediate Supervisor (L1)
                                who reviewed it before, at Level 1.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="grid gap-6">
                            <DocumentSourceField form={form} label="Updated document" />

                            <div className="grid gap-2">
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
                        </CardContent>

                        <CardFooter className="justify-end gap-3">
                            <Button variant="outline" asChild>
                                <Link href={route('documents.show', document.id)}>Cancel</Link>
                            </Button>
                            <SubmitButton processing={processing} progress={progress} busyLabel="Resubmitting…">
                                Resubmit
                            </SubmitButton>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
