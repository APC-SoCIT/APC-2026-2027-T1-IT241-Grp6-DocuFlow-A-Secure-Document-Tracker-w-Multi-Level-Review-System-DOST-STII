<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Task 2.1: document detail and history (stories #2, #3, #4).
 */
class DocumentDetailTest extends TestCase
{
    use RefreshDatabase;

    private User $source;

    private User $l1;

    private User $l1b;

    private User $l2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Storage::fake();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->l1 = User::where('email', 'l1@docuflow.test')->firstOrFail();
        $this->l1b = User::where('email', 'l1b@docuflow.test')->firstOrFail();
        $this->l2 = User::where('email', 'l2@docuflow.test')->firstOrFail();
    }

    private function submit(array $overrides = []): Document
    {
        $this->actingAs($this->source)->post(route('documents.store'), [
            'document_name' => 'Test document',
            'document_type' => 'Memo',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/abc123/edit',
            'l1_reviewer_id' => $this->l1->id,
            ...$overrides,
        ])->assertSessionHasNoErrors();

        return Document::latest('id')->firstOrFail();
    }

    private function act(User $reviewer, Document $document, array $data): void
    {
        $this->actingAs($reviewer)->post(route('reviews.store', $document), [
            'assessment' => 'Meets the requirements.',
            'remarks' => 'Reviewed.',
            ...$data,
        ])->assertSessionHasNoErrors();
    }

    public function test_details_show_level_reviewer_tat_and_overdue(): void
    {
        $document = $this->submit();

        $this->actingAs($this->source)->get(route('documents.show', $document))
            ->assertInertia(fn ($page) => $page
                ->where('document.review_level', 1)
                ->where('document.assigned_reviewer', $this->l1->name)
                ->where('document.tat_days', 0)
                ->where('document.tat_is_final', false)
                ->where('document.is_overdue', false)
                ->where('preview.kind', 'google'));

        // On day 6 with the same reviewer it is overdue (more than 5 days).
        $this->travel(6)->days();
        $this->actingAs($this->source)->get(route('documents.show', $document))
            ->assertInertia(fn ($page) => $page
                ->where('document.tat_days', 6)
                ->where('document.is_overdue', true));

        // Forwarding stops the clock: the L2 starts at 0 days.
        $this->act($this->l1, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);
        $this->actingAs($this->source)->get(route('documents.show', $document))
            ->assertInertia(fn ($page) => $page
                ->where('document.review_level', 2)
                ->where('document.assigned_reviewer', $this->l2->name)
                ->where('document.tat_days', 0)
                ->where('document.is_overdue', false));
    }

    public function test_returned_document_shows_final_tat_remarks_and_full_history(): void
    {
        $document = $this->submit();

        $this->travel(2)->days();
        $this->act($this->l1, $document, ['action' => 'return', 'remarks' => 'Add the budget table.']);

        $this->travel(1)->days();
        $this->actingAs($this->source)->post(route('documents.resubmit', $document), [
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/abc123v2/edit',
            'change_note' => 'Added the budget table.',
        ])->assertSessionHasNoErrors();

        $this->travel(1)->days();
        $this->act($this->l1, $document, ['action' => 'return', 'remarks' => 'Totals are wrong.']);

        $this->actingAs($this->source)->get(route('documents.show', $document))
            ->assertInertia(fn ($page) => $page
                ->where('document.review_level', null)
                ->where('document.assigned_reviewer', null)
                ->where('document.tat_days', 1)
                ->where('document.tat_is_final', true)
                ->where('document.is_overdue', false)
                // Latest return remarks at the top of the page.
                ->where('lastReturn.remarks', 'Totals are wrong.')
                // Revision history.
                ->has('revisions', 2)
                ->where('revisions.0.revision_number', 1)
                ->where('revisions.1.revision_number', 2)
                ->where('revisions.1.submitted_by', $this->source->name)
                ->where('revisions.1.change_note', 'Added the budget table.')
                // Review remarks history, each matched to its revision.
                ->has('reviews', 2)
                ->where('reviews.0.revision_number', 1)
                ->where('reviews.0.remarks', 'Add the budget table.')
                ->where('reviews.0.tat_days', 2)
                ->where('reviews.1.revision_number', 2)
                ->where('reviews.1.reviewer', $this->l1->name)
                ->where('reviews.1.action', 'return')
                ->where('reviews.1.review_level', 1));
    }

    public function test_missing_upload_shows_an_error_but_keeps_the_record(): void
    {
        $document = $this->submit([
            'source_type' => 'file',
            'file' => UploadedFile::fake()->create('report.pdf', 100, 'application/pdf'),
        ]);
        $this->act($this->l1, $document, ['action' => 'return', 'remarks' => 'Fix page 2.']);

        Storage::delete($document->file_path);

        $this->actingAs($this->source)->get(route('documents.show', $document))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('preview.kind', 'missing')
                ->where('document.reference_number', $document->reference_number)
                ->where('lastReturn.remarks', 'Fix page 2.')
                ->has('revisions', 1)
                ->has('reviews', 1));
    }

    public function test_documents_outside_your_access_show_a_permission_error(): void
    {
        $document = $this->submit();

        $this->actingAs($this->l1b)->get(route('documents.show', $document))
            ->assertRedirect(route('reviews.index'))
            ->assertSessionHas('error', "You don't have access to {$document->reference_number}. Only its Document Source and its reviewers can open it.");

        // Not logged in: sent to the login page.
        auth()->logout();
        $this->get(route('documents.show', $document))->assertRedirect(route('login'));
    }
}
