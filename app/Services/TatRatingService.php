<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Carbon;

/**
 * Turnaround time (TAT) and the reviewer rating. TAT is counted in plain
 * calendar days (Philippine time), from assignment to the review action.
 */
class TatRatingService
{
    private const TIMEZONE = 'Asia/Manila';

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
