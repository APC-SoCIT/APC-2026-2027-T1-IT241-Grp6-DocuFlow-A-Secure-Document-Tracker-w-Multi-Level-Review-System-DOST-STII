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
import { ReviewerOption, dropdownProps, optionClassName } from '@/Components/SelectOptions';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';

const FINAL = 'Your review is recorded and can’t be changed afterwards.';

// Same wording as the server-side validation messages.
const MESSAGES = {
    remarks: 'Add your official remarks. When you return a document, they tell the Document Source what to change.',
    l2_reviewer_id: 'Select a Section Head (L2) to forward to.',
};

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
 * The review form's state, shared by the review card (official remarks, L2
 * choice) and the action buttons in the page header.
 * L1 = Return or Forward (to a chosen L2). L2 = Return or Endorse (to the
 * one seeded L3). L3 = Return or Approve. Every action asks for
 * confirmation first, since reviews are final. `review` is null when this
 * person can't review the document.
 */
export function useReview(documentId, review) {
    const form = useForm({
        action: '',
        remarks: '',
        l2_reviewer_id: '',
    });
    const { data, post, transform, setError, clearErrors } = form;
    // The action being confirmed stays set while the dialog animates closed.
    const [confirming, setConfirming] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(null);

    const names = {
        l2Name: review?.l2Reviewers?.find((r) => String(r.id) === data.l2_reviewer_id)?.name,
        l3Name: review?.l3ReviewerName,
    };

    // Catch empty fields before asking for confirmation.
    function missingFor(action) {
        const missing = {};
        if (!data.remarks.trim()) missing.remarks = MESSAGES.remarks;
        if (action === 'forward' && !data.l2_reviewer_id) missing.l2_reviewer_id = MESSAGES.l2_reviewer_id;
        return missing;
    }

    function start(action) {
        clearErrors();
        const missing = missingFor(action);
        if (Object.keys(missing).length) {
            setError(missing);
            // The buttons are in the header; bring the fields that need work into view.
            window.document.getElementById('review-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        setConfirming(action);
        setDialogOpen(true);
    }

    function act(action) {
        setSubmitted(action);
        transform((values) => ({ ...values, action }));
        post(route('reviews.store', documentId), {
            // Stay put for field errors; scroll up when a blocked-action banner shows.
            preserveScroll: (page) => Object.keys(page.props.errors ?? {}).length > 0,
        });
    }

    return {
        review,
        form,
        names,
        confirming,
        dialogOpen,
        setDialogOpen,
        submitted,
        start,
        act,
    };
}

/**
 * Return plus Forward / Endorse / Approve, and the confirmation dialog.
 * Shown in the page header.
 */
export function ReviewActions({ controller }) {
    const { review, form, names, confirming, dialogOpen, setDialogOpen, submitted, start, act } = controller;
    const confirm = confirming ? actionConfig(confirming, names) : null;

    function actionButton(action) {
        const config = actionConfig(action, names);
        const busy = form.processing && submitted === action;

        return (
            <Button variant={config.variant} disabled={form.processing} onClick={() => start(action)}>
                {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
                {busy ? config.busy : config.label}
            </Button>
        );
    }

    return (
        <>
            {actionButton('return')}
            {actionButton(NEXT_ACTION[review.level])}

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

/**
 * Right-column review card: the official remarks, and at Level 1 the
 * Section Head (L2) to forward to.
 */
export default function ReviewPanel({ controller }) {
    const { review, form } = controller;
    const { data, setData, errors } = form;

    return (
        <Card id="review-card" className="scroll-mt-[calc(var(--header-offset,8rem)+1rem)] gap-0">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Your review</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="remarks" className="text-[13px]">
                        Official remarks
                    </Label>
                    <Textarea
                        id="remarks"
                        rows={5}
                        value={data.remarks}
                        onChange={(e) => setData('remarks', e.target.value)}
                        aria-invalid={!!errors.remarks}
                        placeholder="If you return the document, the Document Source sees these."
                    />
                    <FieldError message={errors.remarks} />
                </div>

                {review.level === 1 && (
                    <div className="grid gap-2">
                        <Label htmlFor="l2_reviewer_id" className="text-[13px]">
                            Forward to Section Head (L2)
                        </Label>
                        <Select value={data.l2_reviewer_id} onValueChange={(value) => setData('l2_reviewer_id', value)}>
                            <SelectTrigger id="l2_reviewer_id" className="w-full" aria-invalid={!!errors.l2_reviewer_id}>
                                <SelectValue placeholder="Select a reviewer" />
                            </SelectTrigger>
                            <SelectContent {...dropdownProps}>
                                <SelectGroup>
                                    <SelectLabel>Section Heads (L2)</SelectLabel>
                                    {review.l2Reviewers.map((reviewer) => (
                                        <SelectItem key={reviewer.id} value={String(reviewer.id)} className={optionClassName}>
                                            <ReviewerOption name={reviewer.name} />
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <FieldError message={errors.l2_reviewer_id} />
                    </div>
                )}

                <FieldError message={errors.action} />
            </CardContent>
        </Card>
    );
}
