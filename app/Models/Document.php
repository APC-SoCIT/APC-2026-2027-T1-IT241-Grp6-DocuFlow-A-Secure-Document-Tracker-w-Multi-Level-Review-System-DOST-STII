<?php

namespace App\Models;

use App\Models\Concerns\HasAttachment;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'reference_number',
    'description',
    'document_type',
    'document_type_other',
    'google_workspace_link',
    'file_path',
    'file_name',
    'submitted_at',
    'status',
    'review_state',
    'current_review_level',
    'submitted_by',
    'assigned_reviewer_id',
    'assigned_at',
])]
class Document extends Model
{
    use HasAttachment;

    public const STATUS_PENDING_L1 = 'pending_l1_review';
    public const STATUS_PENDING_L2 = 'pending_l2_review';
    public const STATUS_PENDING_L3 = 'pending_l3_review';
    public const STATUS_RETURNED = 'returned_to_source';
    public const STATUS_APPROVED = 'approved_complete';

    // Story #27: New = assigned but not opened yet; Ongoing = opened, no action yet.
    public const REVIEW_STATE_NEW = 'new';
    public const REVIEW_STATE_ONGOING = 'ongoing';

    // Labels shown in the UI (use case documents' exact wording); the badges match.
    public const STATUS_LABELS = [
        self::STATUS_PENDING_L1 => 'Pending Level 1 Review',
        self::STATUS_PENDING_L2 => 'Pending Level 2 Review',
        self::STATUS_PENDING_L3 => 'Pending Level 3 Review',
        self::STATUS_RETURNED => 'Returned to Source',
        self::STATUS_APPROVED => 'Approved - Complete',
    ];

    public const TYPES = [
        'Report',
        'Policy Draft',
        'Financial Record',
        'Project Proposal',
        'Memo',
        'Other',
    ];

    // The DOCTYPE part of DOCTYPE-YYYY-NNNNN.
    public const TYPE_CODES = [
        'Report' => 'REPORT',
        'Policy Draft' => 'POLICY',
        'Financial Record' => 'FINANCIAL',
        'Project Proposal' => 'PROPOSAL',
        'Memo' => 'MEMO',
        'Other' => 'OTHER',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'current_review_level' => 'integer',
            'submitted_at' => 'datetime',
            'assigned_at' => 'datetime',
        ];
    }

    /**
     * The type as shown in the UI: what the submitter typed for "Other",
     * otherwise the type from the fixed list.
     */
    public function typeLabel(): string
    {
        return $this->document_type === 'Other' && filled($this->document_type_other)
            ? $this->document_type_other
            : $this->document_type;
    }

    public function statusLabel(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }

    /**
     * Documents this account submitted, or that are or were assigned to it.
     * Same rule as isVisibleTo(): Document Source = their own submissions;
     * L1/L2 = submitted by them or assigned to them; L3 = assigned to them.
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $query->where(fn (Builder $q) => $q
            ->where('submitted_by', $user->id)
            ->orWhere('assigned_reviewer_id', $user->id)
            ->orWhere(fn (Builder $q) => $q->reviewedBy($user)));
    }

    /**
     * Documents this account reviewed, on the original submission or on a revision.
     */
    public function scopeReviewedBy(Builder $query, User $user): void
    {
        $byUser = fn (Builder $r) => $r->where('reviewer_id', $user->id);

        $query->where(fn (Builder $q) => $q
            ->whereHas('originalReviews', $byUser)
            ->orWhereHas('revisions.reviews', $byUser));
    }

    /**
     * Its submitter, current reviewer and past reviewers can open it.
     */
    public function isVisibleTo(User $user): bool
    {
        return $this->submitted_by === $user->id
            || $this->assigned_reviewer_id === $user->id
            || $this->reviews()->where('reviewer_id', $user->id)->exists();
    }

    /**
     * Who returned the document most recently, when, and their remarks.
     *
     * @return array{reviewer: string, review_level: int, remarks: ?string, returned_at: mixed}|null
     */
    public function latestReturnSummary(): ?array
    {
        $review = $this->reviews()->with('reviewer:id,name')
            ->where('action', Review::ACTION_RETURN)
            ->latest('id')
            ->first();

        return $review ? [
            'reviewer' => $review->reviewer->name,
            'review_level' => $review->review_level,
            'remarks' => $review->remarks,
            'returned_at' => $review->created_at,
        ] : null;
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function assignedReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_reviewer_id');
    }

    /**
     * Resubmissions only, numbered 1, 2, 3. The original submission is
     * this row, so a document that was never resubmitted has none.
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(DocumentRevision::class);
    }

    public function latestRevision(): ?DocumentRevision
    {
        return $this->revisions()->orderByDesc('revision_number')->first();
    }

    /**
     * The submission under review: the latest revision once the document
     * has been resubmitted, otherwise the original on this row.
     */
    public function latestSubmission(): Document|DocumentRevision
    {
        return $this->latestRevision() ?? $this;
    }

    /**
     * Reviews of the original submission only.
     */
    public function originalReviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Every review of this document: of the original submission and of
     * each revision. A review targets exactly one of them.
     */
    public function reviews(): Builder
    {
        return Review::query()->where(fn (Builder $q) => $q
            ->where('document_id', $this->id)
            ->orWhereIn('revision_id', DocumentRevision::select('id')->where('document_id', $this->id)));
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
