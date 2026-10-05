import DocumentSourceField, { onlyChosenSource } from '@/Components/DocumentSourceField';
import FieldError from '@/Components/FieldError';
import FormSection from '@/Components/FormSection';
import ReturnNotice from '@/Components/ReturnNotice';
import SubmitButton from '@/Components/SubmitButton';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { goBack } from '@/lib/navigation';
import { Head, useForm } from '@inertiajs/react';

export default function Resubmit({ document, lastReturn }) {
    const form = useForm({
        // Start from the current source; an edited Google Doc keeps its link.
        source_type: document.has_file ? 'file' : 'link',
        google_workspace_link: document.google_workspace_link ?? '',
        file: null,
        change_note: '',
    });
    const { data, setData, post, processing, progress, errors, transform } = form;
    const name = document.document_name ?? document.reference_number;
    const backTo = route('documents.show', document.id);

    function submit(event) {
        event.preventDefault();
        transform(onlyChosenSource);
        post(route('documents.resubmit', document.id), { forceFormData: true });
    }

    return (
        <AuthenticatedLayout
            title={`Resubmit ${name}`}
            description={
                <>
                    <span className="font-medium text-foreground">{document.reference_number}</span>
                    <span aria-hidden="true">·</span>
                    <span>Same reference number. It goes back to the Immediate Supervisor (L1) who reviewed it before.</span>
                </>
            }
            back={{ fallback: backTo }}
        >
            <Head title={`Resubmit ${name}`} />

            <div className="max-w-4xl space-y-4">
                {lastReturn && <ReturnNotice lastReturn={lastReturn} />}

                <Card className="gap-0 py-0">
                    <form onSubmit={submit} noValidate className="contents">
                        <div className="divide-y">
                            <FormSection title="Updated document" description="The new revision, with the changes the reviewer asked for.">
                                <DocumentSourceField form={form} label="Source" />
                            </FormSection>

                            <FormSection title="Change note" description="Tell the reviewer what changed in this revision.">
                                <div className="grid gap-2">
                                    <Label htmlFor="change_note" className="sr-only">
                                        Change note
                                    </Label>
                                    <Textarea
                                        id="change_note"
                                        rows={4}
                                        value={data.change_note}
                                        onChange={(e) => setData('change_note', e.target.value)}
                                        placeholder="What did you change in response to the reviewer's remarks?"
                                        aria-invalid={!!errors.change_note}
                                        required
                                    />
                                    <FieldError message={errors.change_note} />
                                </div>
                            </FormSection>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3">
                            <Button variant="outline" onClick={() => goBack(backTo)}>
                                Cancel
                            </Button>
                            <SubmitButton processing={processing} progress={progress} busyLabel="Resubmitting…">
                                Resubmit
                            </SubmitButton>
                        </div>
                    </form>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
