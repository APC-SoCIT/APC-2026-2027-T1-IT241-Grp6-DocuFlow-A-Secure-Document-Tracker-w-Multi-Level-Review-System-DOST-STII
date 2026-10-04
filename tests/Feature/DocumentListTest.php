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

    private User $reyes;

    private User $cruz;

    private User $sectionHead;

    private User $divisionChief;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->reyes = User::where('email', 'l1.reyes@docuflow.test')->firstOrFail();
        $this->cruz = User::where('email', 'l1.cruz@docuflow.test')->firstOrFail();
        $this->sectionHead = User::where('email', 'l2@docuflow.test')->firstOrFail();
        $this->divisionChief = User::where('email', 'l3@docuflow.test')->firstOrFail();
    }

    private function submit(User $submitter, User $l1): Document
    {
        return app(WorkflowService::class)->submit($submitter, 'Memo', 'https://docs.google.com/document/d/x/edit', null, $l1->id);
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

        $toReyes = $this->submit($this->source, $this->reyes);          // stays with Reyes
        $toCruz = $this->submit($this->source, $this->cruz);            // Cruz only
        $forwarded = $this->submit($this->source, $this->reyes);        // Reyes -> Carlo -> Liza
        $someoneElses = $this->submit($otherSource, $this->cruz);       // another Document Source
        $byReyes = $this->submit($this->reyes, $this->cruz);            // an L1 as submitter

        $this->act($this->reyes, $forwarded, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id]);
        $this->act($this->sectionHead, $forwarded, ['action' => 'endorse']);

        // Document Source: only what they submitted.
        $this->assertEqualsCanonicalizing(
            [$toReyes->reference_number, $toCruz->reference_number, $forwarded->reference_number],
            $this->listFor($this->source),
        );

        // L1: submitted by them, assigned to them now, or handled by them before.
        $this->assertEqualsCanonicalizing(
            [$toReyes->reference_number, $forwarded->reference_number, $byReyes->reference_number],
            $this->listFor($this->reyes),
        );
        $this->assertEqualsCanonicalizing(
            [$toCruz->reference_number, $someoneElses->reference_number, $byReyes->reference_number],
            $this->listFor($this->cruz),
        );

        // L2: keeps a document after endorsing it on.
        $this->assertSame([$forwarded->reference_number], $this->listFor($this->sectionHead));

        // L3: only what is or was assigned to them.
        $this->assertSame([$forwarded->reference_number], $this->listFor($this->divisionChief));
    }

    public function test_list_rows_have_the_required_columns(): void
    {
        $document = $this->submit($this->source, $this->reyes);
        $this->travel(6)->days();

        $this->actingAs($this->source)->get(route('documents.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Documents/Index')
                ->where('documents.0.reference_number', $document->reference_number)
                ->has('documents.0.submitted_at')
                ->where('documents.0.status', Document::STATUS_PENDING_L1)
                ->where('documents.0.review_level', 1)
                ->where('documents.0.assigned_reviewer', $this->reyes->name)
                ->where('documents.0.tat_days', 6)
                ->where('documents.0.tat_is_final', false)
                ->where('documents.0.is_overdue', true));
    }

    public function test_review_queue_holds_only_documents_waiting_for_this_reviewer(): void
    {
        $waiting = $this->submit($this->source, $this->reyes);
        $forwarded = $this->submit($this->source, $this->reyes);
        $this->act($this->reyes, $forwarded, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id]);

        // Forwarded: gone from Reyes's queue, still in his list.
        $this->assertSame([$waiting->reference_number], $this->listFor($this->reyes, 'reviews.index'));
        $this->assertContains($forwarded->reference_number, $this->listFor($this->reyes));
        $this->assertSame([$forwarded->reference_number], $this->listFor($this->sectionHead, 'reviews.index'));

        // A Document Source has no review queue.
        $this->actingAs($this->source)->get(route('reviews.index'))
            ->assertRedirect(route('documents.index'))
            ->assertSessionHas('error');
    }
}
