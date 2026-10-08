<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Document routing and reference numbers: submit, resubmit, and the review
 * actions at each level. Every change runs in one database transaction, so a
 * failure leaves the document in its previous valid state.
 */
class WorkflowService
{
    /**
     * Actions each review level may take.
     */
    private const ACTIONS_BY_LEVEL = [
        1 => [Review::ACTION_RETURN, Review::ACTION_FORWARD],
        2 => [Review::ACTION_RETURN, Review::ACTION_ENDORSE],
        3 => [Review::ACTION_RETURN, Review::ACTION_APPROVE],
    ];

    /**
     * Status a document has while waiting at each level.
     */
    private const PENDING_STATUS_BY_LEVEL = [
        1 => Document::STATUS_PENDING_L1,
        2 => Document::STATUS_PENDING_L2,
        3 => Document::STATUS_PENDING_L3,
    ];

    public function __construct(
        private TatService $tat,
        private NotificationService $notifications,
    ) {}

    /**
     * @return list<string>
     */
    public function actionsFor(int $level): array
    {
        return self::ACTIONS_BY_LEVEL[$level] ?? [];
    }

    public function pendingStatusFor(int $level): ?string
    {
        return self::PENDING_STATUS_BY_LEVEL[$level] ?? null;
    }

    /**
     * Whether this account is the one the document is waiting on right now.
     */
    public function isAwaitingReviewBy(Document $document, User $user): bool
    {
        return $document->assigned_reviewer_id === $user->id
            && $document->status === $this->pendingStatusFor($document->current_review_level)
            && $document->submitted_by !== $user->id;
    }

    /**
     * Next reference number for a type: DOCTYPE-YYYY-NNNNN, counting up per
     * type per year. Call inside a transaction so the lock holds until the insert.
     */
    public function nextReferenceNumber(string $documentType): string
    {
        $prefix = Document::TYPE_CODES[$documentType].'-'.now()->year.'-';

        $last = Document::where('reference_number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('reference_number')
            ->value('reference_number');

        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    /**
     * The one seeded L3. Endorse picks it automatically (no dropdown).
     */
    public function divisionChiefFor(Document $document, User $reviewer): ?User
    {
        return User::where('role', User::ROLE_L3)
            ->whereKeyNot([$reviewer->id, $document->submitted_by])
            ->first();
    }

    /**
     * The L1 who reviewed it before (the latest Level 1 review).
     */
    public function previousL1ReviewerId(Document $document): ?int
    {
        return $document->reviews()
            ->where('review_level', 1)
            ->latest('id')
            ->value('reviewer_id');
    }

    /**
     * Story #27: the first time the assigned reviewer opens the review
     * screen, New becomes Ongoing.
     */
    public function markOpenedBy(Document $document, User $user): void
    {
        if ($this->isAwaitingReviewBy($document, $user) && $document->review_state === Document::REVIEW_STATE_NEW) {
            $document->update(['review_state' => Document::REVIEW_STATE_ONGOING]);
        }
    }

    /**
     * First submission: new reference number, revision 1, assigned to the
     * chosen L1 at Level 1.
     */
    public function submit(
        User $submitter,
        string $documentType,
        ?string $otherType,
        ?string $description,
        ?string $link,
        ?string $filePath,
        int $l1ReviewerId,
        ?string $fileName = null,
    ): Document {
        return DB::transaction(function () use ($submitter, $documentType, $otherType, $description, $link, $filePath, $l1ReviewerId, $fileName) {
            $document = Document::create([
                'reference_number' => $this->nextReferenceNumber($documentType),
                'description' => $description,
                'document_type' => $documentType,
                'document_type_other' => $documentType === 'Other' ? $otherType : null,
                'google_workspace_link' => $link,
                'file_path' => $filePath,
                'file_name' => $filePath === null ? null : $fileName,
                'submitted_at' => now(),
                'status' => Document::STATUS_PENDING_L1,
                'review_state' => Document::REVIEW_STATE_NEW,
                'current_review_level' => 1,
                'submitted_by' => $submitter->id,
                'assigned_reviewer_id' => $l1ReviewerId,
                'assigned_at' => now(),
            ]);

            $document->revisions()->create([
                'revision_number' => 1,
                'submitted_by' => $submitter->id,
            ]);

            $this->notifications->notify(
                $l1ReviewerId,
                $document,
                "{$submitter->name} submitted {$document->reference_number} for your review.",
            );

            return $document;
        });
    }

    /**
     * Resubmission: same reference number, new revision, back to the same L1,
     * reset to Level 1. The Date Submitted doesn't change.
     */
    public function resubmit(Document $document, User $submitter, ?string $link, ?string $filePath, string $changeNote, int $l1ReviewerId, ?string $fileName = null): void
    {
        DB::transaction(function () use ($document, $submitter, $link, $filePath, $changeNote, $l1ReviewerId, $fileName) {
            $document->update([
                'google_workspace_link' => $link,
                'file_path' => $filePath,
                'file_name' => $filePath === null ? null : $fileName,
                'resubmission_count' => $document->resubmission_count + 1,
                'status' => Document::STATUS_PENDING_L1,
                'review_state' => Document::REVIEW_STATE_NEW,
                'current_review_level' => 1,
                'assigned_reviewer_id' => $l1ReviewerId,
                'assigned_at' => now(),
            ]);

            $revisionNumber = $document->revisions()->max('revision_number') + 1;
            $document->revisions()->create([
                'revision_number' => $revisionNumber,
                'change_note' => $changeNote,
                'submitted_by' => $submitter->id,
            ]);

            $this->notifications->notify(
                $l1ReviewerId,
                $document,
                "{$submitter->name} resubmitted {$document->reference_number} (revision {$revisionNumber}) for your review.",
            );
        });
    }

    /**
     * Record a review action with its TAT and rating, move the document on,
     * and notify whoever is next. Returns the confirmation message.
     */
    public function review(Document $document, User $reviewer, string $action, ?string $assessment, string $remarks, ?int $l2ReviewerId = null): string
    {
        $level = $document->current_review_level;
        $tatDays = $this->tat->daysSinceAssignment($document);

        return DB::transaction(function () use ($document, $reviewer, $level, $action, $assessment, $remarks, $l2ReviewerId, $tatDays) {
            $document->reviews()->create([
                'reviewer_id' => $reviewer->id,
                'review_level' => $level,
                'assessment' => $assessment,
                'remarks' => $remarks,
                'action' => $action,
                'tat_days' => $tatDays,
                'rating' => $this->tat->ratingFor($tatDays),
            ]);

            return match ($action) {
                Review::ACTION_RETURN => $this->returnToSource($document, $reviewer, $level),
                Review::ACTION_FORWARD => $this->assignNextLevel($document, $reviewer, User::findOrFail($l2ReviewerId), 'forwarded'),
                Review::ACTION_ENDORSE => $this->assignNextLevel(
                    $document,
                    $reviewer,
                    $this->divisionChiefFor($document, $reviewer) ?? throw ValidationException::withMessages([
                        'action' => 'There is no Division Chief (L3) account to endorse to.',
                    ]),
                    'endorsed',
                ),
                Review::ACTION_APPROVE => $this->approve($document, $reviewer),
            };
        });
    }

    private function approve(Document $document, User $reviewer): string
    {
        $document->update([
            'status' => Document::STATUS_APPROVED,
            'review_state' => null,
            'assigned_reviewer_id' => null,
            'assigned_at' => null,
        ]);

        $this->notifications->notify(
            $document->submitted_by,
            $document,
            "{$reviewer->name} approved {$document->reference_number}. Review is complete.",
        );

        return "{$document->reference_number} approved.";
    }

    private function returnToSource(Document $document, User $reviewer, int $level): string
    {
        $document->update([
            'status' => Document::STATUS_RETURNED,
            'review_state' => null,
            'assigned_reviewer_id' => null,
            'assigned_at' => null,
        ]);

        $this->notifications->notify(
            $document->submitted_by,
            $document,
            "{$reviewer->name} returned {$document->reference_number} at Level {$level}. Review the remarks and resubmit.",
        );

        return "{$document->reference_number} returned to the Document Source.";
    }

    private function assignNextLevel(Document $document, User $reviewer, User $nextReviewer, string $verb): string
    {
        $nextLevel = $document->current_review_level + 1;

        $document->update([
            'status' => $this->pendingStatusFor($nextLevel),
            'review_state' => Document::REVIEW_STATE_NEW,
            'current_review_level' => $nextLevel,
            'assigned_reviewer_id' => $nextReviewer->id,
            'assigned_at' => now(),
        ]);

        $this->notifications->notify(
            $nextReviewer->id,
            $document,
            "{$reviewer->name} {$verb} {$document->reference_number} to you for Level {$nextLevel} review.",
        );

        return "{$document->reference_number} {$verb} to {$nextReviewer->name}.";
    }
}
