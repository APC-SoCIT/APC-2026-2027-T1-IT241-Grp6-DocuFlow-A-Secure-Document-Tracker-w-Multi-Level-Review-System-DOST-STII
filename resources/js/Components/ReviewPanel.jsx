import FieldError from '@/Components/FieldError';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';

const FINAL = 'Your review is recorded and can’t be changed afterwards.';

// Button label, label while saving, button variant and confirm text per action.
function actionConfig(action, { l2Name, l3Name }) {
    return {
        return: {
            label: 'Return',
            busy: 'Returning…',
            variant: 'return',
            title: 'Return this document?',
            description: `It goes back to the Document Source with your remarks. ${FINAL}`,
        },
        forward: {
            label: 'Forward',
            busy: 'Forwarding…',
            variant: 'default',
            title: 'Forward to the Section Head (L2)?',
            description: `${l2Name ?? 'The selected Section Head (L2)'} becomes the Level 2 reviewer. ${FINAL}`,
        },
        endorse: {
            label: 'Endorse',
            busy: 'Endorsing…',
            variant: 'default',
            title: 'Endorse to the Division Chief (L3)?',
            description: `${l3Name ?? 'The Division Chief (L3)'} becomes the Level 3 reviewer. ${FINAL}`,
        },
        approve: {
            label: 'Approve',
            busy: 'Approving…',
            variant: 'approve',
            title: 'Approve this document?',
            description: `Its status becomes Approved - Complete. ${FINAL}`,
        },
    }[action];
}

const NEXT_ACTION = { 1: 'forward', 2: 'endorse', 3: 'approve' };

/**
 * Right-column review cards: (1) assessment/remarks, (2) the actions for
 * this review level. L1 = Return or Forward (to a chosen L2).
 * L2 = Return or Endorse (to the one seeded L3). L3 = Return or Approve.
 * Every action asks for confirmation first, since reviews are final.
 */
export default function ReviewPanel({ documentId, review }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        action: '',
        assessment: '',
        remarks: '',
        l2_reviewer_id: '',
    });
    // The action being confirmed stays set while the dialog animates closed.
    const [confirming, setConfirming] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(null);

    const names = {
        l2Name: review.l2Reviewers?.find((r) => String(r.id) === data.l2_reviewer_id)?.name,
        l3Name: review.l3ReviewerName,
    };
    const nextAction = NEXT_ACTION[review.level];
    const confirm = confirming ? actionConfig(confirming, names) : null;

    function act(action) {
        setSubmitted(action);
        transform((form) => ({ ...form, action }));
        post(route('reviews.store', documentId), {
            // Stay put for field errors; scroll up when a blocked-action banner shows.
            preserveScroll: (page) => Object.keys(page.props.errors ?? {}).length > 0,
        });
    }

    function actionButton(action) {
        const config = actionConfig(action, names);
        const busy = processing && submitted === action;

        return (
            <Button
                variant={config.variant}
                disabled={processing}
                onClick={() => {
                    setConfirming(action);
                    setDialogOpen(true);
                }}
            >
                {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
                {busy ? config.busy : config.label}
            </Button>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Assessment and remarks</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="assessment">Assessment</Label>
                        <Textarea
                            id="assessment"
                            rows={4}
                            value={data.assessment}
                            onChange={(e) => setData('assessment', e.target.value)}
                            aria-invalid={!!errors.assessment}
                        />
                        <p className="text-sm text-muted-foreground">
                            Required to {review.level === 1 ? 'forward' : review.level === 2 ? 'endorse' : 'approve'}.
                        </p>
                        <FieldError message={errors.assessment} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea
                            id="remarks"
                            rows={4}
                            value={data.remarks}
                            onChange={(e) => setData('remarks', e.target.value)}
                            aria-invalid={!!errors.remarks}
                        />
                        <p className="text-sm text-muted-foreground">
                            Required for every action. If you return the document, the Document
                            Source sees these.
                        </p>
                        <FieldError message={errors.remarks} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Level {review.level} review</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5">
                    {review.level === 1 && (
                        <div className="grid gap-2">
                            <Label htmlFor="l2_reviewer_id">Forward to Section Head (L2)</Label>
                            <Select
                                value={data.l2_reviewer_id}
                                onValueChange={(value) => setData('l2_reviewer_id', value)}
                            >
                                <SelectTrigger
                                    id="l2_reviewer_id"
                                    className="w-full"
                                    aria-invalid={!!errors.l2_reviewer_id}
                                >
                                    <SelectValue placeholder="Select a reviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {review.l2Reviewers.map((reviewer) => (
                                        <SelectItem key={reviewer.id} value={String(reviewer.id)}>
                                            {reviewer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.l2_reviewer_id} />
                        </div>
                    )}

                    {review.level === 2 && (
                        <p className="text-sm text-muted-foreground">
                            Endorsing sends this document to the Division Chief (L3)
                            {review.l3ReviewerName ? `, ${review.l3ReviewerName}` : ''}.
                        </p>
                    )}

                    {review.level === 3 && (
                        <p className="text-sm text-muted-foreground">
                            Approving completes the review. The status becomes Approved - Complete.
                        </p>
                    )}

                    <FieldError message={errors.action} />

                    <div className="flex justify-end gap-3">
                        {actionButton('return')}
                        {actionButton(nextAction)}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant={confirm?.variant} onClick={() => act(confirming)}>
                            {confirm?.label}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
