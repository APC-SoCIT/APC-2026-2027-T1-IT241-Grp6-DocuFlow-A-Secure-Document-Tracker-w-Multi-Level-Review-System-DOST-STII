import DocumentSourceField, { onlyChosenSource } from '@/Components/DocumentSourceField';
import FieldError from '@/Components/FieldError';
import ReturnNotice from '@/Components/ReturnNotice';
import SubmitButton from '@/Components/SubmitButton';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { goBack } from '@/lib/navigation';
import { Head, useForm } from '@inertiajs/react';

const FORM_ID = 'resubmit-document-form';

export default function Resubmit({ document, lastReturn }) {
    const form = useForm({
        // An edited Google Doc keeps its link; an uploaded file needs a new upload.
        source_type: document.has_file ? '' : 'link',
        google_workspace_link: document.google_workspace_link ?? '',
        file: null,
        change_note: '',
    });
    const { data, setData, post, processing, progress, errors, transform } = form;
    const name = document.reference_number;
    const backTo = route('documents.show', document.id);

    function submit(event) {
        event.preventDefault();
        transform(onlyChosenSource);
        post(route('documents.resubmit', document.id), { forceFormData: true });
    }

    return (
        <AuthenticatedLayout
            title={`Resubmit ${name}`}
            back={{ fallback: backTo }}
            surface
            actions={
                <>
                    <Button variant="outline" onClick={() => goBack(backTo)}>
                        Cancel
                    </Button>
                    <SubmitButton form={FORM_ID} processing={processing} progress={progress} busyLabel="Resubmitting…">
                        Resubmit
                    </SubmitButton>
                </>
            }
        >
            <Head title={`Resubmit ${name}`} />

            <form id={FORM_ID} onSubmit={submit} noValidate className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
                <section className="grid content-start gap-5">
                    {lastReturn && <ReturnNotice lastReturn={lastReturn} />}

                    <div className="grid gap-2">
                        <Label htmlFor="change_note" className="text-sm font-semibold">
                            Change note
                        </Label>
                        <Textarea
                            id="change_note"
                            rows={6}
                            value={data.change_note}
                            onChange={(e) => setData('change_note', e.target.value)}
                            placeholder="What did you change in response to the reviewer's remarks?"
                            aria-invalid={!!errors.change_note}
                            required
                        />
                        <FieldError message={errors.change_note} />
                    </div>
                </section>

                <section>
                    <DocumentSourceField form={form} label="Updated file" />
                </section>
            </form>
        </AuthenticatedLayout>
    );
}
