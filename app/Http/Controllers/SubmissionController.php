<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use App\Services\WorkflowService;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * UC-02: Submit / Resubmit Document.
 */
class SubmissionController extends Controller
{
    public function __construct(private WorkflowService $workflow) {}

    /**
     * Show the submission form.
     */
    public function create(Request $request): Response
    {
        if ($request->user()->role !== User::ROLE_DOCUMENT_SOURCE) {
            $this->deny('Only a Document Source can submit documents.');
        }

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
        if ($submitter->role !== User::ROLE_DOCUMENT_SOURCE) {
            $this->deny('Only a Document Source can submit documents.');
        }

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
            'l1_reviewer_id.not_in' => 'Self-Review Restriction: you cannot select yourself as reviewer.',
        ]);

        $usesLink = $validated['source_type'] === 'link';

        $document = $this->workflow->submit(
            $submitter,
            $validated['document_type'],
            $usesLink ? $validated['google_workspace_link'] : null,
            $usesLink ? null : $request->file('file')->store('documents'),
            (int) $validated['l1_reviewer_id'],
        );

        return redirect()->route('documents.show', $document)->with(
            'success',
            "Document {$document->reference_number} submitted. Status: {$document->statusLabel()}.",
        );
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
            // Shown above the form so the changes can be made against them.
            'lastReturn' => $document->latestReturnSummary(),
        ]);
    }

    /**
     * Resubmit a returned document: same reference number, new revision,
     * back to the same L1 as before, reset to Level 1.
     */
    public function resubmit(Request $request, Document $document): RedirectResponse
    {
        $this->authorizeResubmission($request, $document);

        $validated = $request->validate([
            ...$this->sourceRules(),
            'change_note' => ['required', 'string', 'max:2000'],
        ], [
            ...$this->sourceMessages(),
            'change_note.required' => 'Describe what you changed in this revision.',
        ]);

        $l1ReviewerId = $this->workflow->previousL1ReviewerId($document);
        if ($l1ReviewerId === null) {
            $this->deny("{$document->reference_number} can't be resubmitted: it has no previous L1 reviewer to go back to.");
        }

        $usesLink = $validated['source_type'] === 'link';
        $oldFilePath = $document->file_path;
        $newFilePath = $usesLink ? null : $request->file('file')->store('documents');

        $this->workflow->resubmit(
            $document,
            $request->user(),
            $usesLink ? $validated['google_workspace_link'] : null,
            $newFilePath,
            $validated['change_note'],
            $l1ReviewerId,
        );

        // The replaced upload is no longer referenced by anything.
        if ($oldFilePath !== null && $oldFilePath !== $newFilePath) {
            Storage::delete($oldFilePath);
        }

        return redirect()->route('documents.show', $document)->with(
            'success',
            "Document {$document->reference_number} resubmitted. Status: {$document->statusLabel()}.",
        );
    }

    private function authorizeResubmission(Request $request, Document $document): void
    {
        if ($document->submitted_by !== $request->user()->id) {
            $this->deny("Only the Document Source who submitted {$document->reference_number} can resubmit it.");
        }

        if ($document->status !== Document::STATUS_RETURNED) {
            $this->deny("{$document->reference_number} can only be resubmitted after it is returned. Its status is {$document->statusLabel()}.");
        }
    }

    /**
     * Upload rules: a docs.google.com link OR one .pdf/.docx/.xlsx up to 10 MB.
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
                    if (parse_url((string) $value, PHP_URL_HOST) !== 'docs.google.com') {
                        $fail('The link must be a Google Workspace link from docs.google.com.');
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
