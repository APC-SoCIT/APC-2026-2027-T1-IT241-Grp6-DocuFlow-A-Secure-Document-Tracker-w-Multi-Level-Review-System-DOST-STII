<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Review;
use App\Models\User;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    /**
     * My documents: everything the Document Source submitted, newest first.
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->role === User::ROLE_DOCUMENT_SOURCE, 403);

        $documents = Document::with('submitter:id,name')
            ->where('submitted_by', $request->user()->id)
            ->latest()
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
        abort_if($request->user()->role === User::ROLE_DOCUMENT_SOURCE, 403);

        $documents = Document::with('submitter:id,name')
            ->where('assigned_reviewer_id', $request->user()->id)
            ->orderBy('assigned_at')
            ->get();

        return Inertia::render('Reviews/Index', [
            'documents' => $documents->map(fn (Document $d) => $this->listRow($d)),
        ]);
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
            'submitted_at' => $document->created_at,
            'status' => $document->status,
        ];
    }

    /**
     * Show the submission form.
     */
    public function create(Request $request): Response
    {
        abort_unless($request->user()->role === User::ROLE_DOCUMENT_SOURCE, 403);

        return Inertia::render('Documents/Create', [
            'documentTypes' => Document::TYPES,
            // Every seeded L1, minus the submitter (Self-Review Restriction).
            'l1Reviewers' => User::where('role', User::ROLE_L1)
                ->whereKeyNot($request->user()->id)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Submit a new document and assign it to the chosen L1.
     */
    public function store(Request $request): RedirectResponse
    {
        $submitter = $request->user();
        abort_unless($submitter->role === User::ROLE_DOCUMENT_SOURCE, 403);

        $validated = $request->validate([
            'document_type' => ['required', Rule::in(Document::TYPES)],
            ...$this->sourceRules(),
            'l1_reviewer_id' => [
                'bail',
                'required',
                // Self-Review Restriction.
                Rule::notIn([$submitter->id]),
                Rule::exists('users', 'id')->where('role', User::ROLE_L1),
            ],
        ], [
            ...$this->sourceMessages(),
            'l1_reviewer_id.required' => 'Select an Immediate Supervisor (L1).',
            'l1_reviewer_id.exists' => 'Select a valid Immediate Supervisor (L1).',
            'l1_reviewer_id.not_in' => 'You cannot select yourself as reviewer.',
        ]);

        $usesLink = $validated['source_type'] === 'link';
        $filePath = $usesLink ? null : $request->file('file')->store('documents');

        $document = DB::transaction(function () use ($validated, $usesLink, $filePath, $submitter) {
            $document = Document::create([
                'reference_number' => Document::nextReferenceNumber($validated['document_type']),
                'document_type' => $validated['document_type'],
                'google_workspace_link' => $usesLink ? $validated['google_workspace_link'] : null,
                'file_path' => $filePath,
                'status' => Document::STATUS_PENDING_L1,
                'current_review_level' => 1,
                'submitted_by' => $submitter->id,
                'assigned_reviewer_id' => $validated['l1_reviewer_id'],
                'assigned_at' => now(),
            ]);

            $document->revisions()->create([
                'revision_number' => 1,
                'submitted_by' => $submitter->id,
            ]);

            $document->notifications()->create([
                'user_id' => $validated['l1_reviewer_id'],
                'message' => "{$submitter->name} submitted {$document->reference_number} for your review.",
            ]);

            return $document;
        });

        return redirect()->route('documents.show', $document)->with(
            'success',
            "Document {$document->reference_number} submitted. Status: Pending L1 review.",
        );
    }

    /**
     * Document detail view. Task 6.1 turns this into the full review screen.
     */
    public function show(Request $request, Document $document): Response
    {
        $user = $request->user();
        $this->authorizeView($user, $document);

        $lastReturn = $document->status === Document::STATUS_RETURNED
            ? $document->reviews()->with('reviewer:id,name')
                ->where('action', Review::ACTION_RETURN)
                ->latest('id')
                ->first()
            : null;

        return Inertia::render('Documents/Show', [
            'document' => [
                'id' => $document->id,
                'reference_number' => $document->reference_number,
                'document_type' => $document->document_type,
                'submitted_by' => $document->submitter->name,
                'submitted_at' => $document->created_at,
                'status' => $document->status,
                'revision_number' => $document->revisions()->max('revision_number'),
            ],
            'lastReturn' => $lastReturn ? [
                'reviewer' => $lastReturn->reviewer->name,
                'review_level' => $lastReturn->review_level,
                'remarks' => $lastReturn->remarks,
                'returned_at' => $lastReturn->created_at,
            ] : null,
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
        $this->authorizeView($request->user(), $document);
        abort_if($document->file_path === null || ! Storage::exists($document->file_path), 404);

        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);

        return Storage::response(
            $document->file_path,
            "{$document->reference_number}.{$extension}",
            [],
            $extension === 'pdf' ? 'inline' : 'attachment',
        );
    }

    private function authorizeView(User $user, Document $document): void
    {
        abort_unless(
            $document->submitted_by === $user->id
                || $document->assigned_reviewer_id === $user->id
                || $document->reviews()->where('reviewer_id', $user->id)->exists(),
            403,
        );
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
        $pendingStatus = [
            1 => Document::STATUS_PENDING_L1,
            2 => Document::STATUS_PENDING_L2,
            3 => Document::STATUS_PENDING_L3,
        ][$document->current_review_level] ?? null;

        if ($document->assigned_reviewer_id !== $user->id
            || $document->status !== $pendingStatus
            || $document->submitted_by === $user->id) {
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
        ];
    }

    /**
     * Show the resubmission form for a returned document.
     */
    public function editResubmission(Request $request, Document $document): Response
    {
        $this->authorizeResubmission($request, $document);

        return Inertia::render('Documents/Resubmit', [
            'document' => [
                'id' => $document->id,
                'reference_number' => $document->reference_number,
                'google_workspace_link' => $document->google_workspace_link,
                'has_file' => $document->file_path !== null,
            ],
        ]);
    }

    /**
     * Resubmit a returned document: same reference number, new revision,
     * back to the same L1 as before, reset to Level 1.
     */
    public function resubmit(Request $request, Document $document): RedirectResponse
    {
        $this->authorizeResubmission($request, $document);
        $submitter = $request->user();

        $validated = $request->validate([
            ...$this->sourceRules(),
            'change_note' => ['required', 'string', 'max:2000'],
        ], [
            ...$this->sourceMessages(),
            'change_note.required' => 'Describe what you changed in this revision.',
        ]);

        // The L1 who reviewed it before (the latest Level 1 review).
        $l1ReviewerId = $document->reviews()
            ->where('review_level', 1)
            ->latest('id')
            ->value('reviewer_id');
        abort_if($l1ReviewerId === null, 409, 'This document has no previous L1 reviewer.');

        $usesLink = $validated['source_type'] === 'link';
        $oldFilePath = $document->file_path;
        $newFilePath = $usesLink ? null : $request->file('file')->store('documents');

        DB::transaction(function () use ($document, $validated, $usesLink, $newFilePath, $submitter, $l1ReviewerId) {
            $document->update([
                'google_workspace_link' => $usesLink ? $validated['google_workspace_link'] : null,
                'file_path' => $newFilePath,
                'status' => Document::STATUS_PENDING_L1,
                'current_review_level' => 1,
                'assigned_reviewer_id' => $l1ReviewerId,
                'assigned_at' => now(),
            ]);

            $revisionNumber = $document->revisions()->max('revision_number') + 1;
            $document->revisions()->create([
                'revision_number' => $revisionNumber,
                'change_note' => $validated['change_note'],
                'submitted_by' => $submitter->id,
            ]);

            $document->notifications()->create([
                'user_id' => $l1ReviewerId,
                'message' => "{$submitter->name} resubmitted {$document->reference_number} (revision {$revisionNumber}) for your review.",
            ]);
        });

        // The replaced upload is no longer referenced by anything.
        if ($oldFilePath !== null && $oldFilePath !== $newFilePath) {
            Storage::delete($oldFilePath);
        }

        return redirect()->route('documents.show', $document)->with(
            'success',
            "Document {$document->reference_number} resubmitted. Status: Pending L1 review.",
        );
    }

    private function authorizeResubmission(Request $request, Document $document): void
    {
        abort_unless(
            $document->submitted_by === $request->user()->id
                && $document->status === Document::STATUS_RETURNED,
            403,
        );
    }

    /**
     * Upload rules: a Google Workspace link OR one .pdf/.docx/.xlsx up to 10 MB.
     *
     * @return array<string, mixed>
     */
    private function sourceRules(): array
    {
        return [
            'source_type' => ['required', Rule::in(['link', 'file'])],
            'google_workspace_link' => [
                'nullable',
                'required_if:source_type,link',
                'url',
                function (string $attribute, mixed $value, Closure $fail) {
                    $host = parse_url((string) $value, PHP_URL_HOST);
                    if (! in_array($host, ['docs.google.com', 'drive.google.com'], true)) {
                        $fail('The link must be a docs.google.com or drive.google.com link.');
                    }
                },
            ],
            'file' => [
                'nullable',
                'required_if:source_type,file',
                'file',
                'extensions:pdf,docx,xlsx',
                // .docx/.xlsx are zip archives; some exporters are only detected as zip.
                'mimetypes:application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip',
                'max:10240', // KB = 10 MB
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function sourceMessages(): array
    {
        return [
            'google_workspace_link.required_if' => 'Enter a Google Workspace link.',
            'file.required_if' => 'Choose a file to upload.',
            'file.extensions' => 'The file must be a PDF, DOCX or XLSX file.',
            'file.mimetypes' => 'The file must be a PDF, DOCX or XLSX file.',
            'file.max' => 'The file must be 10 MB or smaller.',
            // PHP rejected the upload before Laravel saw it (over the server's upload limit).
            'file.uploaded' => 'The file must be 10 MB or smaller.',
        ];
    }
}
