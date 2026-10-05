<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use App\Services\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 2.2: lists with the right columns and access (stories #1, #5, #7, #9).
 */
class DocumentListTest extends TestCase
{
    use RefreshDatabase;

    private User $source;

    private User $l1;

    private User $l1b;

    private User $l2;

    private User $l3;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->l1 = User::where('email', 'l1@docuflow.test')->firstOrFail();
        $this->l1b = User::where('email', 'l1b@docuflow.test')->firstOrFail();
        $this->l2 = User::where('email', 'l2@docuflow.test')->firstOrFail();
        $this->l3 = User::where('email', 'l3@docuflow.test')->firstOrFail();
    }

    private function submit(User $submitter, User $l1): Document
    {
        return app(WorkflowService::class)->submit($submitter, 'Memo', null, null, 'https://docs.google.com/document/d/x/edit', null, $l1->id);
    }

    private function act(User $reviewer, Document $document, array $data): void
    {
        $this->actingAs($reviewer)->post(route('reviews.store', $document), [
            'assessment' => 'Meets the requirements.',
            'remarks' => 'Reviewed.',
            ...$data,
        ])->assertSessionHasNoErrors();
    }

    /** @return list<string> */
    private function listFor(User $user, string $route = 'documents.index'): array
    {
        $refs = [];
        $this->actingAs($user)->get(route($route))
            ->assertOk()
            ->assertInertia(function ($page) use (&$refs) {
                $refs = collect($page->toArray()['props']['documents'])->pluck('reference_number')->sort()->values()->all();
            });

        return $refs;
    }

    public function test_each_role_sees_only_documents_within_their_access(): void
    {
        $otherSource = User::factory()->create(['role' => User::ROLE_DOCUMENT_SOURCE]);

        $toSofia = $this->submit($this->source, $this->l1);          // stays with Sofia
        $toCarlo = $this->submit($this->source, $this->l1b);            // Carlo only
        $forwarded = $this->submit($this->source, $this->l1);        // Sofia -> Nairb -> RomeoJr
        $someoneElses = $this->submit($otherSource, $this->l1b);       // another Document Source
        $bySofia = $this->submit($this->l1, $this->l1b);            // an L1 as submitter

        $this->act($this->l1, $forwarded, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);
        $this->act($this->l2, $forwarded, ['action' => 'endorse']);

        // Document Source: only what they submitted.
        $this->assertEqualsCanonicalizing(
            [$toSofia->reference_number, $toCarlo->reference_number, $forwarded->reference_number],
            $this->listFor($this->source),
        );

        // L1: submitted by them, assigned to them now, or handled by them before.
        $this->assertEqualsCanonicalizing(
            [$toSofia->reference_number, $forwarded->reference_number, $bySofia->reference_number],
            $this->listFor($this->l1),
        );
        $this->assertEqualsCanonicalizing(
            [$toCarlo->reference_number, $someoneElses->reference_number, $bySofia->reference_number],
            $this->listFor($this->l1b),
        );

        // L2: keeps a document after endorsing it on.
        $this->assertSame([$forwarded->reference_number], $this->listFor($this->l2));

        // L3: only what is or was assigned to them.
        $this->assertSame([$forwarded->reference_number], $this->listFor($this->l3));
    }

    public function test_list_rows_have_the_required_columns(): void
    {
        $document = $this->submit($this->source, $this->l1);
        $this->travel(6)->days();

        $this->actingAs($this->source)->get(route('documents.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Documents/Index')
                ->where('documents.0.reference_number', $document->reference_number)
                ->has('documents.0.submitted_at')
                ->where('documents.0.status', Document::STATUS_PENDING_L1)
                ->where('documents.0.review_level', 1)
                ->where('documents.0.assigned_reviewer', $this->l1->name)
                ->where('documents.0.tat_days', 6)
                ->where('documents.0.tat_is_final', false)
                ->where('documents.0.is_overdue', true));
    }

    public function test_review_queue_holds_only_documents_waiting_for_this_reviewer(): void
    {
        $waiting = $this->submit($this->source, $this->l1);
        $forwarded = $this->submit($this->source, $this->l1);
        $this->act($this->l1, $forwarded, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);

        // Forwarded: gone from Sofia's queue, still in his list.
        $this->assertSame([$waiting->reference_number], $this->listFor($this->l1, 'reviews.index'));
        $this->assertContains($forwarded->reference_number, $this->listFor($this->l1));
        $this->assertSame([$forwarded->reference_number], $this->listFor($this->l2, 'reviews.index'));

        // A Document Source has no review queue.
        $this->actingAs($this->source)->get(route('reviews.index'))
            ->assertRedirect(route('documents.index'))
            ->assertSessionHas('error');
    }
}
