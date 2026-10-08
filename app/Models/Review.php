<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'document_id',
    'reviewer_id',
    'review_level',
    'remarks',
    'action',
    'tat_days',
])]
class Review extends Model
{
    public const ACTION_RETURN = 'return';
    public const ACTION_FORWARD = 'forward';
    public const ACTION_ENDORSE = 'endorse';
    public const ACTION_APPROVE = 'approve';

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
