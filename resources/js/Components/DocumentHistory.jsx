import HistoryDialog from '@/Components/HistoryDialog';
import { Card, CardHeader, CardTitle } from '@/Components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronsRightIcon, FileTextIcon, Undo2Icon } from 'lucide-react';
import { useState } from 'react';

const ACTIONS = {
    return: { label: 'Returned', icon: Undo2Icon, className: 'bg-status-returned-bg text-status-returned' },
    forward: { label: 'Forwarded', icon: ChevronsRightIcon, className: 'bg-muted text-foreground' },
    endorse: { label: 'Endorsed', icon: ChevronsRightIcon, className: 'bg-muted text-foreground' },
    approve: { label: 'Approved', icon: CheckIcon, className: 'bg-status-approved-bg text-status-approved' },
};

function days(n) {
    return n === null || n === undefined ? null : `${n} ${n === 1 ? 'day' : 'days'}`;
}

// One row of the timeline; the whole row opens the full record.
function Entry({ icon: Icon, iconClassName, title, meta, date, text, onClick }) {
    return (
        <li className="relative">
            <button
                type="button"
                onClick={onClick}
                className="flex w-full gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
            >
                <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', iconClassName)}>
                    <Icon aria-hidden="true" className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium">{title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{date}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{meta}</span>
                    {text && <span className="mt-1 line-clamp-2 block text-[13px] text-foreground/90">{text}</span>}
                </span>
            </button>
        </li>
    );
}

/**
 * Review remarks history and revision history (read-only), as a compact
 * timeline in the right column. Each entry opens its full record.
 */
export default function DocumentHistory({ revisions, reviews }) {
    // The last opened record stays set while the dialog animates closed.
    const [dialog, setDialog] = useState(null); // see HistoryDialog's `record`
    const [dialogOpen, setDialogOpen] = useState(false);
    const view = (record) => {
        setDialog(record);
        setDialogOpen(true);
    };

    return (
        <Card className="gap-3 pb-2">
            <Tabs defaultValue={reviews.length > 0 ? 'reviews' : 'revisions'} className="gap-3">
                <CardHeader className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">History</CardTitle>
                    <TabsList className="h-7">
                        <TabsTrigger value="reviews" className="px-2 text-xs">
                            Review remarks
                            <span className="text-muted-foreground tabular-nums">{reviews.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="revisions" className="px-2 text-xs">
                            Revisions
                            <span className="text-muted-foreground tabular-nums">{revisions.length}</span>
                        </TabsTrigger>
                    </TabsList>
                </CardHeader>

                <TabsContent value="reviews" className="px-2">
                    {reviews.length === 0 ? (
                        <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">No reviews yet.</p>
                    ) : (
                        <ol>
                            {[...reviews].reverse().map((r) => {
                                const action = ACTIONS[r.action] ?? { label: r.action, icon: FileTextIcon, className: 'bg-muted' };
                                return (
                                    <Entry
                                        key={r.id}
                                        icon={action.icon}
                                        iconClassName={action.className}
                                        title={`${action.label} at Level ${r.review_level}`}
                                        meta={`${r.reviewer} · Revision ${r.revision_number}${r.tat_days !== null && r.tat_days !== undefined ? ` · TAT ${days(r.tat_days)}` : ''}`}
                                        date={formatDate(r.reviewed_at)}
                                        text={r.remarks}
                                        onClick={() =>
                                            view({
                                                title: `${action.label} at Level ${r.review_level}`,
                                                subtitle: `${r.reviewer} · ${formatDateTime(r.reviewed_at)}`,
                                                facts: [
                                                    ['Revision', r.revision_number],
                                                    ['Review level', `Level ${r.review_level}`],
                                                    ['Action', action.label],
                                                    ['Reviewer', r.reviewer],
                                                    ['TAT', days(r.tat_days)],
                                                ],
                                                notes: [['Official remarks', r.remarks]],
                                            })
                                        }
                                    />
                                );
                            })}
                        </ol>
                    )}
                </TabsContent>

                <TabsContent value="revisions" className="px-2">
                    <ol>
                        {[...revisions].reverse().map((r) => {
                            const first = r.revision_number === 1;
                            const note = r.change_note ?? (first ? 'First submission' : null);
                            return (
                                <Entry
                                    key={r.id}
                                    icon={FileTextIcon}
                                    iconClassName="bg-muted text-muted-foreground"
                                    title={`Revision ${r.revision_number}`}
                                    meta={`${first ? 'Submitted' : 'Resubmitted'} by ${r.submitted_by}`}
                                    date={formatDate(r.submitted_at)}
                                    text={note}
                                    onClick={() =>
                                        view({
                                            title: `Revision ${r.revision_number}`,
                                            subtitle: `${first ? 'Submitted' : 'Resubmitted'} by ${r.submitted_by} · ${formatDateTime(r.submitted_at)}`,
                                            facts: [
                                                ['Revision', r.revision_number],
                                                [first ? 'Date Submitted' : 'Resubmitted', formatDate(r.submitted_at)],
                                                [first ? 'Submitted by' : 'Resubmitted by', r.submitted_by],
                                            ],
                                            notes: [['Change note', note]],
                                        })
                                    }
                                />
                            );
                        })}
                    </ol>
                </TabsContent>
            </Tabs>

            <HistoryDialog open={dialogOpen} onOpenChange={setDialogOpen} record={dialog} />
        </Card>
    );
}
