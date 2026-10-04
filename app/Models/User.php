<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'role', 'section'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_DOCUMENT_SOURCE = 'document_source';
    public const ROLE_L1 = 'l1';
    public const ROLE_L2 = 'l2';
    public const ROLE_L3 = 'l3';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Document Sources, L1 and L2 reviewers can submit documents; the L3 can't.
     */
    public function canSubmitDocuments(): bool
    {
        return in_array($this->role, [self::ROLE_DOCUMENT_SOURCE, self::ROLE_L1, self::ROLE_L2], true);
    }

    /**
     * Where this account lands after login: My documents or Review queue.
     */
    public function homeRoute(): string
    {
        return $this->role === self::ROLE_DOCUMENT_SOURCE
            ? 'documents.index'
            : 'reviews.index';
    }

    public function submittedDocuments(): HasMany
    {
        return $this->hasMany(Document::class, 'submitted_by');
    }

    public function assignedDocuments(): HasMany
    {
        return $this->hasMany(Document::class, 'assigned_reviewer_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    /**
     * The app's own in-system notifications. Overrides the Notifiable
     * trait's relation, which points at Laravel's notification table format.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
