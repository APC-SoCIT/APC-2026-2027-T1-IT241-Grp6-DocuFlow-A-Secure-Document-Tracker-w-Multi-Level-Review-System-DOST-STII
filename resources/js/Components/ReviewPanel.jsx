import FieldError from '@/Components/FieldError';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { CircleCheckIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';

const FINAL = 'Your review is recorded and can’t be changed afterwards.';

const LEVEL_ROLES = {
    1: 'Immediate Supervisor (L1)',
    2: 'Section Head (L2)',
    3: 'Division Chief (L3)',
};

// Same wording as the server-side validation messages.
const MESSAGES = {
    assessment: 'Add your assessment before you forward, endorse or approve.',
    remarks: 'Add your remarks. When you return a document, they tell the Document Source what to change.',
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

// Accordion header: the field name, then what's in it (or what's needed).
function FieldTrigger({ label, value, hint, error }) {
    const filled = value.trim() !== '';

    return (
        <AccordionTrigger className="items-center py-3 hover:no-underline">
            <span className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                <span className="shrink-0 text-[13px] font-medium">{label}</span>
                {filled ? (
                    <>
                        <CircleCheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-status-approved" />
                        <span className="truncate text-xs font-normal text-muted-foreground">{value}</span>
                    </>
                ) : (
                    <span className={cn('truncate text-xs font-normal', error ? 'text-destructive' : 'text-muted-foreground')}>
                        {hint}
                    </span>
                )}
            </span>
        </AccordionTrigger>
    );
}

/**
 * Right-column review card: assessment and remarks (an accordion, so the
 * column stays short), then the actions for this review level.
 * L1 = Return or Forward (to a chosen L2). L2 = Return or Endorse (to the
 * one seeded L3). L3 = Return or Approve. Every action asks for
 * confirmation first, since reviews are final.
 */
export default function ReviewPanel({ documentId, review }) {
    const { data, setData, post, processing, errors, transform, setError, clearErrors } = useForm({
        action: '',
        assessment: '',
        remarks: '',
        l2_reviewer_id: '',
    });
    const [openFields, setOpenFields] = useState([]);
    // The action being confirmed stays set while the dialog animates closed.
    const [confirming, setConfirming] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(null);

    const names = {
        l2Name: review.l2Reviewers?.find((r) => String(r.id) === data.l2_reviewer_id)?.name,
        l3Name: review.l3ReviewerName,
    };
    const nextAction = NEXT_ACTION[review.level];
    const nextVerb = { 1: 'forward', 2: 'endorse', 3: 'approve' }[review.level];
    const confirm = confirming ? actionConfig(confirming, names) : null;

    // Open whichever field the server (or the check below) flagged.
    useEffect(() => {
        const flagged = ['assessment', 'remarks'].filter((field) => errors[field]);
        if (flagged.length) {
            setOpenFields((current) => [...new Set([...current, ...flagged])]);
        }
    }, [errors]);

    // Catch empty fields before asking for confirmation.
    function missingFor(action) {
        const missing = {};
        if (!data.remarks.trim()) missing.remarks = MESSAGES.remarks;
        if (action !== 'return' && !data.assessment.trim()) missing.assessment = MESSAGES.assessment;
        if (action === 'forward' && !data.l2_reviewer_id) missing.l2_reviewer_id = MESSAGES.l2_reviewer_id;
        return missing;
    }

    function start(action) {
        clearErrors();
        const missing = missingFor(action);
        if (Object.keys(missing).length) {
            setError(missing);
            return;
        }
        setConfirming(action);
        setDialogOpen(true);
    }

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
            <Button variant={config.variant} disabled={processing} onClick={() => start(action)}>
                {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
                {busy ? config.busy : config.label}
            </Button>
        );
    }

    return (
        <Card className="gap-0 pb-0">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold">Your review</CardTitle>
                <CardDescription className="text-xs">
                    Level {review.level} · {LEVEL_ROLES[review.level]}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <Accordion type="multiple" value={openFields} onValueChange={setOpenFields}>
                    <AccordionItem value="assessment">
                        <FieldTrigger
                            label="Assessment"
                            value={data.assessment}
                            hint={`Required to ${nextVerb}`}
                            error={errors.assessment}
                        />
                        <AccordionContent className="space-y-2 pb-3">
                            <Label htmlFor="assessment" className="sr-only">
                                Assessment
                            </Label>
                            <Textarea
                                id="assessment"
                                rows={4}
                                value={data.assessment}
                                onChange={(e) => setData('assessment', e.target.value)}
                                aria-invalid={!!errors.assessment}
                                placeholder="Your evaluation of the document"
                            />
                            <FieldError message={errors.assessment} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="remarks">
                        <FieldTrigger
                            label="Remarks"
                            value={data.remarks}
                            hint="Required for every action"
                            error={errors.remarks}
                        />
                        <AccordionContent className="space-y-2 pb-3">
                            <Label htmlFor="remarks" className="sr-only">
                                Remarks
                            </Label>
                            <Textarea
                                id="remarks"
                                rows={4}
                                value={data.remarks}
                                onChange={(e) => setData('remarks', e.target.value)}
                                aria-invalid={!!errors.remarks}
                                placeholder="If you return the document, the Document Source sees these."
                            />
                            <FieldError message={errors.remarks} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {review.level === 1 && (
                    <div className="grid gap-2">
                        <Label htmlFor="l2_reviewer_id" className="text-[13px]">
                            Forward to Section Head (L2)
                        </Label>
                        <Select value={data.l2_reviewer_id} onValueChange={(value) => setData('l2_reviewer_id', value)}>
                            <SelectTrigger id="l2_reviewer_id" className="w-full" aria-invalid={!!errors.l2_reviewer_id}>
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
                    <p className="text-[13px] text-muted-foreground">
                        Endorsing sends this document to the Division Chief (L3)
                        {review.l3ReviewerName ? `, ${review.l3ReviewerName}` : ''}.
                    </p>
                )}

                {review.level === 3 && (
                    <p className="text-[13px] text-muted-foreground">
                        Approving completes the review. The status becomes Approved - Complete.
                    </p>
                )}

                <FieldError message={errors.action} />
            </CardContent>

            <CardFooter className="mt-4 justify-end gap-2">
                {actionButton('return')}
                {actionButton(nextAction)}
            </CardFooter>

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
        </Card>
    );
}
