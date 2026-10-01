import FieldError from '@/Components/FieldError';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { NativeSelect } from '@/Components/ui/native-select';
import { Textarea } from '@/Components/ui/textarea';
import { useForm } from '@inertiajs/react';

/**
 * Right-column review cards: (1) assessment/remarks, (2) the actions for
 * this review level. L1 = Return or Forward (to a chosen L2).
 * L2 = Return or Endorse (to the one seeded L3). L3 = Return or Approve.
 */
export default function ReviewPanel({ documentId, review }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        action: '',
        remarks: '',
        l2_reviewer_id: '',
    });

    function act(action) {
        transform((form) => ({ ...form, action }));
        post(route('reviews.store', documentId), { preserveScroll: true });
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <Label htmlFor="remarks" className="mb-0 text-base">
                            Assessment and remarks
                        </Label>
                    </CardTitle>
                    <p className="mt-1 text-sm text-ink-muted">
                        Required when returning, so the Document Source knows what to change.
                    </p>
                </CardHeader>
                <CardContent className="pt-3">
                    <Textarea
                        id="remarks"
                        rows={6}
                        value={data.remarks}
                        onChange={(e) => setData('remarks', e.target.value)}
                        aria-invalid={!!errors.remarks}
                    />
                    <FieldError message={errors.remarks} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Level {review.level} review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-3">
                    {review.level === 1 && (
                        <div>
                            <Label htmlFor="l2_reviewer_id">Forward to Section Head (L2)</Label>
                            <NativeSelect
                                id="l2_reviewer_id"
                                value={data.l2_reviewer_id}
                                onChange={(e) => setData('l2_reviewer_id', e.target.value)}
                                aria-invalid={!!errors.l2_reviewer_id}
                            >
                                <option value="" disabled>
                                    Select a reviewer
                                </option>
                                {review.l2Reviewers.map((reviewer) => (
                                    <option key={reviewer.id} value={reviewer.id}>
                                        {reviewer.name}
                                    </option>
                                ))}
                            </NativeSelect>
                            <FieldError message={errors.l2_reviewer_id} />
                        </div>
                    )}

                    {review.level === 2 && (
                        <p className="text-sm text-ink-muted">
                            Endorsing sends this document to the Division Chief (L3)
                            {review.l3ReviewerName ? `, ${review.l3ReviewerName}` : ''}.
                        </p>
                    )}

                    <FieldError message={errors.action} />

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outlined-rust"
                            disabled={processing}
                            onClick={() => act('return')}
                        >
                            Return
                        </Button>
                        {review.level === 1 && (
                            <Button disabled={processing} onClick={() => act('forward')}>
                                Forward
                            </Button>
                        )}
                        {review.level === 2 && (
                            <Button disabled={processing} onClick={() => act('endorse')}>
                                Endorse
                            </Button>
                        )}
                        {review.level === 3 && (
                            <Button disabled={processing} onClick={() => act('approve')}>
                                Approve
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
