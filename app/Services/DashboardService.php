<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * UC-01 dashboard summaries (stories #1, #6, #8, #10). Plain numbers, no
 * charts. Definitions (PLAN.md, Task 2.5):
 * - Pending = New + Ongoing (incomplete reviews)
 * - Workload = incomplete reviews currently assigned to each reviewer
 * - Average TAT / Average Rating = over completed reviews; null = "No Data"
 */
class DashboardService
{
    private const PENDING_STATUSES = [
        Document::STATUS_PENDING_L1,
        Document::STATUS_PENDING_L2,
        Document::STATUS_PENDING_L3,
    ];

    private const REVIEWER_ROLES = [User::ROLE_L1, User::ROLE_L2, User::ROLE_L3];

    /**
     * @return array<string, mixed>
     */
    public function forUser(User $user): array
    {
        return match ($user->role) {
            User::ROLE_DOCUMENT_SOURCE => $this->documentSource($user),
            User::ROLE_L1, User::ROLE_L2 => [
                'kind' => 'section',
                'title' => $user->section ? "{$user->section} summary" : 'Your summary',
                'queue' => $this->queueCount($user),
                ...$this->summary($this->sectionReviewers($user)),
            ],
            User::ROLE_L3 => [
                'kind' => 'system',
                'title' => 'System-wide summary',
                'queue' => $this->queueCount($user),
                ...$this->summary(User::whereIn('role', self::REVIEWER_ROLES)->orderBy('name')->get()),
            ],
            default => ['kind' => 'none'],
        };
    }

    /**
     * Document Source: their own submissions. Total = in review + returned + approved.
     *
     * @return array<string, mixed>
     */
    private function documentSource(User $user): array
    {
        $byStatus = Document::where('submitted_by', $user->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $count = fn (array $statuses) => (int) collect($statuses)->sum(fn ($s) => $byStatus[$s] ?? 0);

        return [
            'kind' => 'source',
            'title' => 'My submissions',
            'total' => (int) $byStatus->sum(),
            'in_review' => $count(self::PENDING_STATUSES),
            'returned' => $count([Document::STATUS_RETURNED]),
            'approved' => $count([Document::STATUS_APPROVED]),
        ];
    }

    private function queueCount(User $user): int
    {
        return Document::where('assigned_reviewer_id', $user->id)
            ->whereIn('status', self::PENDING_STATUSES)
            ->count();
    }

    /**
     * Reviewers in the same section as this L1 or L2 (just them if no section).
     *
     * @return Collection<int, User>
     */
    private function sectionReviewers(User $user): Collection
    {
        if (! $user->section) {
            return collect([$user]);
        }

        return User::whereIn('role', self::REVIEWER_ROLES)
            ->where('section', $user->section)
            ->orderBy('name')
            ->get();
    }

    /**
     * @param  Collection<int, User>  $reviewers
     * @return array<string, mixed>
     */
    private function summary(Collection $reviewers): array
    {
        $ids = $reviewers->pluck('id');

        $pending = Document::whereIn('assigned_reviewer_id', $ids)
            ->whereIn('status', self::PENDING_STATUSES)
            ->get(['assigned_reviewer_id', 'review_state']);

        $new = $pending->where('review_state', Document::REVIEW_STATE_NEW)->count();
        $ongoing = $pending->where('review_state', Document::REVIEW_STATE_ONGOING)->count();

        $completed = Review::whereIn('reviewer_id', $ids);
        $averageTat = (clone $completed)->avg('tat_days');
        $averageRating = (clone $completed)->avg('rating');

        return [
            'new' => $new,
            'ongoing' => $ongoing,
            'pending' => $new + $ongoing,
            'average_tat' => $averageTat === null ? null : round((float) $averageTat, 1),
            'average_rating' => $averageRating === null ? null : round((float) $averageRating, 1),
            'workload' => $reviewers->map(fn (User $reviewer) => [
                'name' => $reviewer->name,
                'role' => $reviewer->role,
                'count' => $pending->where('assigned_reviewer_id', $reviewer->id)->count(),
            ])->values()->all(),
        ];
    }
}
