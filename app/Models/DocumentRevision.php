<?php

namespace App\Models;

use App\Models\Concerns\HasAttachment;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One resubmission of a returned document, with its own link or file.
 */
#[Fillable([
    'document_id',
    'revision_number',
    'change_note',
    'google_workspace_link',
    'file_path',
    'file_name',
    'submitted_by',
])]
class DocumentRevision extends Model
{
    use HasAttachment;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'revision_number' => 'integer',
        ];
    }

    public function typeLabel(): string
    {
        return $this->document->typeLabel();
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'revision_id');
    }
}
