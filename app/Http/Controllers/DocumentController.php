<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
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
            'l1_reviewer_id' => [
                'bail',
                'required',
                // Self-Review Restriction.
                Rule::notIn([$submitter->id]),
                Rule::exists('users', 'id')->where('role', User::ROLE_L1),
            ],
        ], [
            'google_workspace_link.required_if' => 'Enter a Google Workspace link.',
            'file.required_if' => 'Choose a file to upload.',
            'file.extensions' => 'The file must be a PDF, DOCX or XLSX file.',
            'file.mimetypes' => 'The file must be a PDF, DOCX or XLSX file.',
            'file.max' => 'The file must be 10 MB or smaller.',
            // PHP rejected the upload before Laravel saw it (over the server's upload limit).
            'file.uploaded' => 'The file must be 10 MB or smaller.',
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

        return redirect()->route('documents.index')->with(
            'success',
            "Document {$document->reference_number} submitted. Status: Pending L1 review.",
        );
    }
}
