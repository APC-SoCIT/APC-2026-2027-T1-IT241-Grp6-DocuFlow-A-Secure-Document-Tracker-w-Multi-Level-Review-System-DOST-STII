<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'reference_number',
    'document_type',
    'google_workspace_link',
    'file_path',
    'submitted_at',
    'resubmission_count',
    'status',
    'current_review_level',
    'submitted_by',
    'assigned_reviewer_id',
    'assigned_at',
])]
class Document extends Model
{
    public const STATUS_PENDING_L1 = 'pending_l1_review';
    public const STATUS_PENDING_L2 = 'pending_l2_review';
    public const STATUS_PENDING_L3 = 'pending_l3_review';
    public const STATUS_RETURNED = 'returned_to_source';
    public const STATUS_APPROVED = 'approved_complete';

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
            'resubmission_count' => 'integer',
            'assigned_at' => 'datetime',
        ];
    }

    /**
     * Embeddable URL for a Google Workspace link (its /preview form, no API
     * key needed), or null when the link isn't in a recognised shape.
     */
    public function googlePreviewUrl(): ?string
    {
        $link = (string) $this->google_workspace_link;

        // docs.google.com/document/d/ID/edit, drive.google.com/file/d/ID/view, ...
        if (preg_match('#^(https?://(?:docs|drive)\.google\.com/(?:document|spreadsheets|presentation|file)/d/[\w-]+)#', $link, $m)) {
            return $m[1].'/preview';
        }

        // drive.google.com/open?id=ID
        if (preg_match('#^https?://drive\.google\.com/open\?(?:.*&)?id=([\w-]+)#', $link, $m)) {
            return 'https://drive.google.com/file/d/'.$m[1].'/preview';
        }

        return null;
    }

    public function statusLabel(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
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

    public function revisions(): HasMany
    {
        return $this->hasMany(DocumentRevision::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
