<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Carbon;

/**
 * Turnaround time (TAT) and the reviewer rating. TAT is counted in plain
 * calendar days (Philippine time), from assignment to the review action.
 */
class TatService
{
    private const TIMEZONE = 'Asia/Manila';

    /**
     * Held for more than this many calendar days = overdue.
     */
    public const OVERDUE_AFTER_DAYS = 5;

    /**
     * TAT to show for a document: the running count while a reviewer holds
     * it, otherwise the last reviewer's final TAT. Null before any review.
     */
    public function currentTat(Document $document): ?int
    {
        if ($document->assigned_at !== null) {
            return $this->daysSinceAssignment($document);
        }

        return $document->reviews()->latest('id')->value('tat_days');
    }

    /**
     * Pending with the assigned reviewer for more than 5 calendar days.
     * Worked out on the fly; there is no scheduler.
     */
    public function isOverdue(Document $document): bool
    {
        return $document->assigned_at !== null
            && $this->daysSinceAssignment($document) > self::OVERDUE_AFTER_DAYS;
    }

    /**
     * Calendar days from when the current reviewer received the document.
     */
    public function daysSinceAssignment(Document $document, ?Carbon $at = null): int
    {
        return $this->daysBetween($document->assigned_at, $at ?? now());
    }

    public function daysBetween(Carbon $from, Carbon $to): int
    {
        $start = $from->copy()->setTimezone(self::TIMEZONE)->startOfDay();
        $end = $to->copy()->setTimezone(self::TIMEZONE)->startOfDay();

        return (int) $start->diffInDays($end);
    }

    /**
     * 5 if done before day 5, 3 if on day 5, 1 if after.
     */
    public function ratingFor(int $tatDays): int
    {
        return match (true) {
            $tatDays < 5 => 5,
            $tatDays === 5 => 3,
            default => 1,
        };
    }
}
