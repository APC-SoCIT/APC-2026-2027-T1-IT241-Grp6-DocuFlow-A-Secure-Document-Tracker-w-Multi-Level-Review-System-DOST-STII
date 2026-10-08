<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use App\Services\WorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * UC-03: Review Document. L1 = Return or Forward, L2 = Return or Endorse,
 * L3 = Return or Approve.
 */
class ReviewController extends Controller
{
    public function __construct(private WorkflowService $workflow) {}

    /**
     * Record the assigned reviewer's action on a document.
     */
    public function store(Request $request, Document $document): RedirectResponse
    {
        $reviewer = $request->user();
        $level = $document->current_review_level;

        // Self-Review Restriction: never review your own submission.
        if ($document->submitted_by === $reviewer->id) {
            $this->deny("Self-Review Restriction: you can't review {$document->reference_number} because you submitted it.");
        }

        if ($document->status !== $this->workflow->pendingStatusFor($level)) {
            $this->deny("{$document->reference_number} is no longer waiting for review. Its status is {$document->statusLabel()}.");
        }

        if ($document->assigned_reviewer_id !== $reviewer->id) {
            $this->deny("{$document->reference_number} is not assigned to you for review.");
        }

        $validated = $request->validate([
            'action' => ['required', Rule::in($this->workflow->actionsFor($level))],
            // Every action needs the reviewer's official remarks.
            'remarks' => ['required', 'string', 'max:5000'],
            'l2_reviewer_id' => [
                'exclude_unless:action,forward',
                'bail',
                'required',
                Rule::notIn([$reviewer->id, $document->submitted_by]),
                Rule::exists('users', 'id')->where('role', User::ROLE_L2),
            ],
        ], [
            'action.in' => 'That action is not available at this review level.',
            'remarks.required' => 'Add your remarks. When you return a document, they tell the Document Source what to change.',
            'l2_reviewer_id.required' => 'Select a Section Head (L2) to forward to.',
            'l2_reviewer_id.not_in' => 'Self-Review Restriction: you cannot forward a document to yourself or its submitter.',
            'l2_reviewer_id.exists' => 'Select a valid Section Head (L2).',
        ]);

        $message = $this->workflow->review(
            $document,
            $reviewer,
            $validated['action'],
            $validated['remarks'],
            isset($validated['l2_reviewer_id']) ? (int) $validated['l2_reviewer_id'] : null,
        );

        return redirect()->route('reviews.index')->with('success', $message);
    }
}
