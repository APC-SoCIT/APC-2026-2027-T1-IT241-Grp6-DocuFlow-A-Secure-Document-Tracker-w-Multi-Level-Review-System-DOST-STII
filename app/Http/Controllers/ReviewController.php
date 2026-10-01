<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    /**
     * Actions each review level may take.
     */
    private const ACTIONS_BY_LEVEL = [
        1 => [Review::ACTION_RETURN, Review::ACTION_FORWARD],
        2 => [Review::ACTION_RETURN, Review::ACTION_ENDORSE],
        3 => [Review::ACTION_RETURN, Review::ACTION_APPROVE],
    ];

    /**
     * Status a document has while waiting at each level.
     */
    private const PENDING_STATUS_BY_LEVEL = [
        1 => Document::STATUS_PENDING_L1,
        2 => Document::STATUS_PENDING_L2,
        3 => Document::STATUS_PENDING_L3,
    ];

    /**
     * Record the assigned reviewer's action on a document.
     */
    public function store(Request $request, Document $document): RedirectResponse
    {
        $reviewer = $request->user();
        $level = $document->current_review_level;

        abort_unless(
            $document->assigned_reviewer_id === $reviewer->id
                && $document->status === (self::PENDING_STATUS_BY_LEVEL[$level] ?? null),
            403,
        );
        // Self-Review Restriction: never review your own submission.
        abort_if($document->submitted_by === $reviewer->id, 403);

        $validated = $request->validate([
            'action' => ['required', Rule::in(self::ACTIONS_BY_LEVEL[$level] ?? [])],
            'remarks' => ['nullable', 'required_if:action,return', 'string', 'max:5000'],
            'l2_reviewer_id' => [
                'exclude_unless:action,forward',
                'bail',
                'required',
                Rule::notIn([$reviewer->id, $document->submitted_by]),
                Rule::exists('users', 'id')->where('role', User::ROLE_L2),
            ],
        ], [
            'action.in' => 'That action is not available at this review level.',
            'remarks.required_if' => 'Add remarks so the Document Source knows what to change.',
            'l2_reviewer_id.required' => 'Select a Section Head (L2) to forward to.',
            'l2_reviewer_id.not_in' => 'You cannot forward a document to yourself or its submitter.',
            'l2_reviewer_id.exists' => 'Select a valid Section Head (L2).',
        ]);

        $tatDays = $document->daysSinceAssignment();

        $message = DB::transaction(function () use ($document, $reviewer, $level, $validated, $tatDays) {
            $document->reviews()->create([
                'reviewer_id' => $reviewer->id,
                'review_level' => $level,
                'remarks' => $validated['remarks'] ?? null,
                'action' => $validated['action'],
                'tat_days' => $tatDays,
                'rating' => Review::ratingFor($tatDays),
            ]);

            return match ($validated['action']) {
                Review::ACTION_RETURN => $this->returnToSource($document, $reviewer, $level),
                Review::ACTION_FORWARD => $this->assignNextLevel(
                    $document,
                    $reviewer,
                    User::findOrFail($validated['l2_reviewer_id']),
                    'forwarded',
                ),
                Review::ACTION_ENDORSE => $this->assignNextLevel(
                    $document,
                    $reviewer,
                    $this->divisionChiefFor($document, $reviewer),
                    'endorsed',
                ),
                Review::ACTION_APPROVE => $this->approve($document, $reviewer),
            };
        });

        return redirect()->route('reviews.index')->with('success', $message);
    }

    /**
     * The one seeded L3. Endorse picks it automatically (no dropdown).
     */
    private function divisionChiefFor(Document $document, User $reviewer): User
    {
        $divisionChief = User::where('role', User::ROLE_L3)
            ->whereKeyNot([$reviewer->id, $document->submitted_by])
            ->first();

        if ($divisionChief === null) {
            throw ValidationException::withMessages([
                'action' => 'There is no Division Chief (L3) account to endorse to.',
            ]);
        }

        return $divisionChief;
    }

    private function approve(Document $document, User $reviewer): string
    {
        $document->update([
            'status' => Document::STATUS_APPROVED,
            'assigned_reviewer_id' => null,
            'assigned_at' => null,
        ]);

        $document->notifications()->create([
            'user_id' => $document->submitted_by,
            'message' => "{$reviewer->name} approved {$document->reference_number}. Review is complete.",
        ]);

        return "{$document->reference_number} approved.";
    }

    private function returnToSource(Document $document, User $reviewer, int $level): string
    {
        $document->update([
            'status' => Document::STATUS_RETURNED,
            'assigned_reviewer_id' => null,
            'assigned_at' => null,
        ]);

        $document->notifications()->create([
            'user_id' => $document->submitted_by,
            'message' => "{$reviewer->name} returned {$document->reference_number} at Level {$level}. Review the remarks and resubmit.",
        ]);

        return "{$document->reference_number} returned to the Document Source.";
    }

    private function assignNextLevel(Document $document, User $reviewer, User $nextReviewer, string $verb): string
    {
        $nextLevel = $document->current_review_level + 1;

        $document->update([
            'status' => self::PENDING_STATUS_BY_LEVEL[$nextLevel],
            'current_review_level' => $nextLevel,
            'assigned_reviewer_id' => $nextReviewer->id,
            'assigned_at' => now(),
        ]);

        $document->notifications()->create([
            'user_id' => $nextReviewer->id,
            'message' => "{$reviewer->name} {$verb} {$document->reference_number} to you for Level {$nextLevel} review.",
        ]);

        return "{$document->reference_number} {$verb} to {$nextReviewer->name}.";
    }
}
