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
    'status',
    'current_review_level',
    'submitted_by',
    'assigned_reviewer_id',
    'assigned_at',
    'ai_feedback_text',
])]
class Document extends Model
{
    public const STATUS_PENDING_L1 = 'pending_l1_review';
    public const STATUS_PENDING_L2 = 'pending_l2_review';
    public const STATUS_PENDING_L3 = 'pending_l3_review';
    public const STATUS_RETURNED = 'returned_to_source';
    public const STATUS_APPROVED = 'approved_complete';

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
     * Next reference number for a type, counting up per type per year.
     * Call inside a transaction so the lock holds until the insert.
     */
    public static function nextReferenceNumber(string $documentType): string
    {
        $prefix = self::TYPE_CODES[$documentType].'-'.now()->year.'-';

        $last = self::where('reference_number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('reference_number')
            ->value('reference_number');

        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'current_review_level' => 'integer',
            'assigned_at' => 'datetime',
        ];
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
