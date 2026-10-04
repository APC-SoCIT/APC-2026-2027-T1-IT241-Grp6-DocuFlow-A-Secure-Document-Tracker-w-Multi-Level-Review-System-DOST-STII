<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use App\Services\WorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Document lists, the document (review) screen, and access to uploaded files.
 */
class DocumentController extends Controller
{
    public function __construct(private WorkflowService $workflow) {}

    /**
     * My documents: everything the Document Source submitted, newest first.
     */
    public function index(Request $request): Response
    {
        if ($request->user()->role !== User::ROLE_DOCUMENT_SOURCE) {
            $this->deny('Only a Document Source has a My documents list. Your documents to review are in your Review queue.');
        }

        $documents = Document::with('submitter:id,name')
            ->where('submitted_by', $request->user()->id)
            ->latest('submitted_at')
            ->get();

        return Inertia::render('Documents/Index', [
            'documents' => $documents->map(fn (Document $d) => $this->listRow($d)),
        ]);
    }

    /**
     * Review queue: documents currently assigned to this reviewer,
     * oldest assignment first (TAT counts from assignment).
     */
    public function reviewQueue(Request $request): Response
    {
        if ($request->user()->role === User::ROLE_DOCUMENT_SOURCE) {
            $this->deny('Only reviewers have a Review queue. Your submissions are in My documents.');
        }

        $documents = Document::with('submitter:id,name')
            ->where('assigned_reviewer_id', $request->user()->id)
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

        return Inertia::render('Documents/Show', [
            'document' => [
                'id' => $document->id,
                'reference_number' => $document->reference_number,
                'document_type' => $document->document_type,
                'submitted_by' => $document->submitter->name,
                'submitted_at' => $document->submitted_at,
                'status' => $document->status,
                'revision_number' => $document->revisions()->max('revision_number'),
            ],
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
            "{$document->reference_number}.{$extension}",
            [],
            $extension === 'pdf' ? 'inline' : 'attachment',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function listRow(Document $document): array
    {
        return [
            'id' => $document->id,
            'reference_number' => $document->reference_number,
            'document_type' => $document->document_type,
            'submitted_by' => $document->submitter->name,
            'submitted_at' => $document->submitted_at,
            'status' => $document->status,
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

        $extension = pathinfo((string) $document->file_path, PATHINFO_EXTENSION);

        return [
            'kind' => $extension === 'pdf' ? 'pdf' : 'file',
            'extension' => $extension,
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
