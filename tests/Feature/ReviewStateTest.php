<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 2.4: review state New / Ongoing (story #27).
 */
class ReviewStateTest extends TestCase
{
    use RefreshDatabase;

    private User $source;

    private User $reyes;

    private User $sectionHead;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->reyes = User::where('email', 'l1.reyes@docuflow.test')->firstOrFail();
        $this->sectionHead = User::where('email', 'l2@docuflow.test')->firstOrFail();
    }

    private function state(Document $document): ?string
    {
        return $document->fresh()->review_state;
    }

    private function act(User $reviewer, Document $document, array $data): void
    {
        $this->actingAs($reviewer)->post(route('reviews.store', $document), [
            'assessment' => 'Meets the requirements.',
            'remarks' => 'Reviewed.',
            ...$data,
        ])->assertSessionHasNoErrors();
    }

    public function test_new_until_the_assigned_reviewer_opens_it_then_ongoing(): void
    {
        $this->actingAs($this->source)->post(route('documents.store'), [
            'document_type' => 'Memo',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/x/edit',
            'l1_reviewer_id' => $this->reyes->id,
        ]);
        $document = Document::latest('id')->firstOrFail();
        $this->assertSame('new', $this->state($document));

        // The submitter opening it doesn't count.
        $this->actingAs($this->source)->get(route('documents.show', $document));
        $this->assertSame('new', $this->state($document));

        // The queue shows New.
        $this->actingAs($this->reyes)->get(route('reviews.index'))
            ->assertInertia(fn ($page) => $page->where('documents.0.review_state', 'new'));

        // The assigned reviewer opens it: Ongoing, and it stays Ongoing.
        $this->actingAs($this->reyes)->get(route('documents.show', $document));
        $this->assertSame('ongoing', $this->state($document));
        $this->actingAs($this->reyes)->get(route('documents.show', $document));
        $this->assertSame('ongoing', $this->state($document));

        // Forward: New again for the L2, Ongoing when they open it.
        $this->act($this->reyes, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id]);
        $this->assertSame('new', $this->state($document));
        $this->actingAs($this->sectionHead)->get(route('documents.show', $document));
        $this->assertSame('ongoing', $this->state($document));

        // Endorse: New for the L3.
        $this->act($this->sectionHead, $document, ['action' => 'endorse']);
        $this->assertSame('new', $this->state($document));

        // Approve: no reviewer holds it any more.
        $l3 = User::where('email', 'l3@docuflow.test')->firstOrFail();
        $this->act($l3, $document, ['action' => 'approve']);
        $this->assertNull($this->state($document));
    }

    public function test_return_clears_it_and_resubmit_resets_to_new(): void
    {
        $this->actingAs($this->source)->post(route('documents.store'), [
            'document_type' => 'Memo',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/x/edit',
            'l1_reviewer_id' => $this->reyes->id,
        ]);
        $document = Document::latest('id')->firstOrFail();
        $this->actingAs($this->reyes)->get(route('documents.show', $document));
        $this->act($this->reyes, $document, ['action' => 'return', 'remarks' => 'Fix it.']);
        $this->assertNull($this->state($document));

        $this->actingAs($this->source)->post(route('documents.resubmit', $document), [
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/x2/edit',
            'change_note' => 'Fixed.',
        ])->assertSessionHasNoErrors();
        $this->assertSame('new', $this->state($document));
    }
}
