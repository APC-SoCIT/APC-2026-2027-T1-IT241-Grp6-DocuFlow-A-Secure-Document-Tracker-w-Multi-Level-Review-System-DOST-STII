<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'document_id',
    'reviewer_id',
    'review_level',
    'assessment',
    'remarks',
    'action',
    'tat_days',
    'rating',
])]
class Review extends Model
{
    public const ACTION_RETURN = 'return';
    public const ACTION_FORWARD = 'forward';
    public const ACTION_ENDORSE = 'endorse';
    public const ACTION_APPROVE = 'approve';

    /**
     * 5 if done before day 5, 3 if on day 5, 1 if after.
     */
    public static function ratingFor(int $tatDays): int
    {
        return match (true) {
            $tatDays < 5 => 5,
            $tatDays === 5 => 3,
            default => 1,
        };
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'review_level' => 'integer',
            'tat_days' => 'integer',
            'rating' => 'integer',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
