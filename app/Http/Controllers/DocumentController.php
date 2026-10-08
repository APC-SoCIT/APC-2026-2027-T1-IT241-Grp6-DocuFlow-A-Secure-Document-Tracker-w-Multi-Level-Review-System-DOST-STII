<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use App\Services\TatService;
use App\Services\WorkflowService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Document lists, the document (review) screen, and access to uploaded files.
 */
class DocumentController extends Controller
{
    public function __construct(
        private WorkflowService $workflow,
        private TatService $tat,
    ) {}

    /**
     * My documents, for every role: what this account submitted, or what is
     * or was assigned to it. Newest Date Submitted first.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filters = $this->filtersFrom($request);

        $documents = $this->filteredDocuments($user, $filters)
            ->with('assignedReviewer:id,name')
            ->latest('submitted_at')
            ->get();

        return Inertia::render('Documents/Index', [
            'documents' => $documents->map(fn (Document $d) => $this->listRow($d)),
            'filters' => (object) $filters,
            'statusOptions' => Document::STATUS_LABELS,
            'canFilterByRole' => $this->canFilterByRole($user),
        ]);
    }

    /**
     * Quick results for the search box in the header: the same filters and
     * access rules as My documents, newest first, a handful at a time.
     */
    public function search(Request $request): JsonResponse
    {
        $user = $request->user();

        $documents = $this->filteredDocuments($user, $this->filtersFrom($request))
            ->latest('submitted_at')
            ->limit(6)
            ->get();

        return response()->json([
            'documents' => $documents->map(fn (Document $d) => [
                'id' => $d->id,
                'reference_number' => $d->reference_number,
                'document_type' => $d->typeLabel(),
                'status' => $d->status,
                'submitted_at' => $d->submitted_at,
            ]),
        ]);
    }

    private function canFilterByRole(User $user): bool
    {
        return in_array($user->role, [User::ROLE_L1, User::ROLE_L2], true);
    }

    /**
     * The list filters from the query string, without empty values. The role
     * filter only applies to L1 and L2.
     *
     * @return array<string, string>
     */
    private function filtersFrom(Request $request): array
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(array_keys(Document::STATUS_LABELS))],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'role' => ['nullable', Rule::in(['submitted', 'assigned'])],
        ]);
        if (! $this->canFilterByRole($request->user())) {
            unset($filters['role']);
        }

        return array_filter($filters, fn ($value) => $value !== null && $value !== '');
    }

    /**
     * Documents this account may see, narrowed by the filters. Search looks
     * at the reference number and the document type (including a typed "Other").
     *
     * @param  array<string, string>  $filters
     */
    private function filteredDocuments(User $user, array $filters): Builder
    {
        return Document::query()
            ->visibleTo($user)
            ->when($filters['search'] ?? null, fn (Builder $q, string $search) => $q->where(fn (Builder $q) => $q
                ->where('reference_number', 'like', "%{$search}%")
                ->orWhere('document_type', 'like', "%{$search}%")
                ->orWhere('document_type_other', 'like', "%{$search}%")))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            // Date Submitted range, whole days in Philippine time.
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q
                ->where('submitted_at', '>=', Carbon::parse($from, 'Asia/Manila')->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q
                ->where('submitted_at', '<=', Carbon::parse($to, 'Asia/Manila')->endOfDay()->utc()))
            ->when(($filters['role'] ?? null) === 'submitted', fn (Builder $q) => $q->where('submitted_by', $user->id))
            ->when(($filters['role'] ?? null) === 'assigned', fn (Builder $q) => $q->where(fn (Builder $q) => $q
                ->where('assigned_reviewer_id', $user->id)
                ->orWhereHas('reviews', fn (Builder $r) => $r->where('reviewer_id', $user->id))));
    }

    /**
     * Review queue: documents assigned to this reviewer and waiting for
     * their review, oldest assignment first (TAT counts from assignment).
     */
    public function reviewQueue(Request $request): Response
    {
        if ($request->user()->role === User::ROLE_DOCUMENT_SOURCE) {
            $this->deny('Only reviewers have a Review queue. Your submissions are in My documents.');
        }

        $documents = Document::with('assignedReviewer:id,name')
            ->where('assigned_reviewer_id', $request->user()->id)
            ->whereIn('status', [Document::STATUS_PENDING_L1, Document::STATUS_PENDING_L2, Document::STATUS_PENDING_L3])
            ->orderBy('assigned_at')
            ->get();

        return Inertia::render('Reviews/Index', [
            'documents' => $documents->map(fn (Document $d) => $this->listRow($d)),
        ]);
    }

    /**
     * The document screen: preview beside details, and the review actions
     * for the assigned reviewer.
     */
    public function show(Request $request, Document $document): Response
    {
        $user = $request->user();
        if (! $document->isVisibleTo($user)) {
            $this->deny("You don't have access to {$document->reference_number}. Only its Document Source and its reviewers can open it.");
        }

        $this->workflow->markOpenedBy($document, $user);

        $isPending = $this->workflow->pendingStatusFor($document->current_review_level) === $document->status;

        return Inertia::render('Documents/Show', [
            'document' => [
                'id' => $document->id,
                'reference_number' => $document->reference_number,
                'description' => $document->description,
                'document_type' => $document->typeLabel(),
                'submitted_by' => $document->submitter->name,
                'submitted_at' => $document->submitted_at,
                'status' => $document->status,
                'review_state' => $document->review_state,
                'revision_number' => $document->revisions()->max('revision_number'),
                'review_level' => $isPending ? $document->current_review_level : null,
                'assigned_reviewer' => $document->assignedReviewer?->name,
                'tat_days' => $this->tat->currentTat($document),
                'tat_is_final' => ! $isPending,
                'is_overdue' => $this->tat->isOverdue($document),
            ],
            ...$this->historyFor($document),
            'lastReturn' => $document->status === Document::STATUS_RETURNED
                ? $document->latestReturnSummary()
                : null,
            'canResubmit' => $document->submitted_by === $user->id
                && $document->status === Document::STATUS_RETURNED,
            'preview' => $this->previewFor($document),
            'review' => $this->reviewPanelFor($user, $document),
        ]);
    }

    /**
     * Serve an uploaded file to someone allowed to view the document:
     * PDFs inline (for the preview iframe), .docx/.xlsx as a download.
     */
    public function file(Request $request, Document $document): StreamedResponse
    {
        abort_unless($document->isVisibleTo($request->user()), 403);
        abort_if($document->file_path === null || ! Storage::exists($document->file_path), 404);

        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);

        return Storage::response(
            $document->file_path,
            $document->displayFileName(),
            [],
            $extension === 'pdf' ? 'inline' : 'attachment',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function listRow(Document $document): array
    {
        $isPending = $this->workflow->pendingStatusFor($document->current_review_level) === $document->status;

        return [
            'id' => $document->id,
            'reference_number' => $document->reference_number,
            'document_type' => $document->typeLabel(),
            'submitted_at' => $document->submitted_at,
            'status' => $document->status,
            'review_state' => $document->review_state,
            'review_level' => $isPending ? $document->current_review_level : null,
            'assigned_reviewer' => $document->assignedReviewer?->name,
            'tat_days' => $this->tat->currentTat($document),
            'tat_is_final' => ! $isPending,
            'is_overdue' => $this->tat->isOverdue($document),
        ];
    }

    /**
     * Revision history and review remarks history, oldest first. Both are
     * read-only. Each review is matched to the revision it was made on.
     *
     * @return array{revisions: list<array<string, mixed>>, reviews: list<array<string, mixed>>}
     */
    private function historyFor(Document $document): array
    {
        $revisions = $document->revisions()->with('submitter:id,name')->orderBy('revision_number')->get();
        $reviews = $document->reviews()->with('reviewer:id,name')->orderBy('id')->get();

        return [
            'revisions' => $revisions->map(fn ($revision) => [
                'id' => $revision->id,
                'revision_number' => $revision->revision_number,
                'submitted_at' => $revision->created_at,
                'submitted_by' => $revision->submitter->name,
                'change_note' => $revision->change_note,
            ])->all(),
            'reviews' => $reviews->map(fn ($review) => [
                'id' => $review->id,
                'revision_number' => $revisions
                    ->filter(fn ($revision) => $revision->created_at <= $review->created_at)
                    ->max('revision_number') ?? 1,
                'review_level' => $review->review_level,
                'reviewer' => $review->reviewer->name,
                'action' => $review->action,
                'reviewed_at' => $review->created_at,
                'tat_days' => $review->tat_days,
                'rating' => $review->rating,
                'assessment' => $review->assessment,
                'remarks' => $review->remarks,
            ])->all(),
        ];
    }

    /**
     * What the left-hand preview panel should show.
     *
     * @return array<string, mixed>
     */
    private function previewFor(Document $document): array
    {
        if ($document->google_workspace_link !== null) {
            return [
                'kind' => 'google',
                'embed_url' => $document->googlePreviewUrl(),
                'open_url' => $document->google_workspace_link,
            ];
        }

        // The record, remarks and history stay usable even if the upload is gone.
        if ($document->file_path === null || ! Storage::exists($document->file_path)) {
            return ['kind' => 'missing'];
        }

        $extension = pathinfo((string) $document->file_path, PATHINFO_EXTENSION);

        return [
            'kind' => $extension === 'pdf' ? 'pdf' : 'file',
            'extension' => $extension,
            'file_name' => $document->displayFileName(),
            'open_url' => route('documents.file', $document),
        ];
    }

    /**
     * Review actions for the assigned reviewer, or null when they can't act.
     *
     * @return array<string, mixed>|null
     */
    private function reviewPanelFor(User $user, Document $document): ?array
    {
        if (! $this->workflow->isAwaitingReviewBy($document, $user)) {
            return null;
        }

        return [
            'level' => $document->current_review_level,
            // Every seeded L2, minus this reviewer and the submitter (Self-Review Restriction).
            'l2Reviewers' => $document->current_review_level === 1
                ? User::where('role', User::ROLE_L2)
                    ->whereKeyNot([$user->id, $document->submitted_by])
                    ->orderBy('name')
                    ->get(['id', 'name'])
                : [],
            // Endorse goes to the one seeded L3; shown so the L2 knows who.
            'l3ReviewerName' => $document->current_review_level === 2
                ? $this->workflow->divisionChiefFor($document, $user)?->name
                : null,
        ];
    }
}
