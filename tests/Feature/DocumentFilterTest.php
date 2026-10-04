<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use App\Services\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 2.3: search and filters (stories #1, #5, #7, #9).
 */
class DocumentFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $source;

    private User $reyes;

    private User $cruz;

    private User $sectionHead;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->reyes = User::where('email', 'l1.reyes@docuflow.test')->firstOrFail();
        $this->cruz = User::where('email', 'l1.cruz@docuflow.test')->firstOrFail();
        $this->sectionHead = User::where('email', 'l2@docuflow.test')->firstOrFail();
    }

    private function submit(string $type, ?User $submitter = null, ?User $l1 = null): Document
    {
        return app(WorkflowService::class)->submit(
            $submitter ?? $this->source,
            $type,
            'https://docs.google.com/document/d/x/edit',
            null,
            ($l1 ?? $this->reyes)->id,
        );
    }

    /** @return list<string> */
    private function refs(User $user, array $query = []): array
    {
        $refs = [];
        $this->actingAs($user)->get(route('documents.index', $query))
            ->assertOk()
            ->assertInertia(function ($page) use (&$refs) {
                $refs = collect($page->toArray()['props']['documents'])->pluck('reference_number')->sort()->values()->all();
            });

        return $refs;
    }

    public function test_search_by_reference_number_or_document_type(): void
    {
        $memo = $this->submit('Memo');
        $report = $this->submit('Report');
        $policy = $this->submit('Policy Draft');

        $this->assertSame([$memo->reference_number], $this->refs($this->source, ['search' => $memo->reference_number]));
        $this->assertSame([$report->reference_number], $this->refs($this->source, ['search' => 'report']));
        $this->assertSame([$policy->reference_number], $this->refs($this->source, ['search' => 'Policy Draft']));
        $this->assertSame([], $this->refs($this->source, ['search' => 'nothing-like-this']));
    }

    public function test_status_and_date_submitted_filters(): void
    {
        $old = $this->submit('Memo');
        $old->update(['submitted_at' => now()->subDays(10)]);
        $returned = $this->submit('Report');
        $this->actingAs($this->reyes)->post(route('reviews.store', $returned), [
            'action' => 'return', 'remarks' => 'Fix it.',
        ])->assertSessionHasNoErrors();
        $recent = $this->submit('Other');

        $this->assertSame(
            [$returned->reference_number],
            $this->refs($this->source, ['status' => Document::STATUS_RETURNED]),
        );

        $today = now('Asia/Manila')->toDateString();
        $this->assertEqualsCanonicalizing(
            [$returned->reference_number, $recent->reference_number],
            $this->refs($this->source, ['from' => $today, 'to' => $today]),
        );
        $this->assertSame(
            [$old->reference_number],
            $this->refs($this->source, ['to' => now('Asia/Manila')->subDays(5)->toDateString()]),
        );

        // Filters combine.
        $this->assertSame([], $this->refs($this->source, ['status' => Document::STATUS_RETURNED, 'to' => now('Asia/Manila')->subDays(5)->toDateString()]));
    }

    public function test_role_filter_for_l1_and_l2(): void
    {
        $byReyes = $this->submit('Memo', $this->reyes, $this->cruz);   // Reyes submitted it
        $toReyes = $this->submit('Report');                             // assigned to Reyes

        $this->assertSame([$byReyes->reference_number], $this->refs($this->reyes, ['role' => 'submitted']));
        $this->assertSame([$toReyes->reference_number], $this->refs($this->reyes, ['role' => 'assigned']));
        $this->assertEqualsCanonicalizing(
            [$byReyes->reference_number, $toReyes->reference_number],
            $this->refs($this->reyes),
        );

        // Only L1 and L2 get the role filter; others ignore it.
        $this->actingAs($this->reyes)->get(route('documents.index'))
            ->assertInertia(fn ($page) => $page->where('canFilterByRole', true));
        $this->actingAs($this->source)->get(route('documents.index', ['role' => 'assigned']))
            ->assertInertia(fn ($page) => $page->where('canFilterByRole', false)->has('documents', 1));
    }

    public function test_filters_are_returned_to_the_page_and_clear_resets_them(): void
    {
        $this->submit('Memo');

        $this->actingAs($this->source)->get(route('documents.index', ['search' => 'zzz', 'status' => Document::STATUS_PENDING_L1]))
            ->assertInertia(fn ($page) => $page
                ->where('filters.search', 'zzz')
                ->where('filters.status', Document::STATUS_PENDING_L1)
                ->has('documents', 0));

        // Clear = no query string: everything is back.
        $this->actingAs($this->source)->get(route('documents.index'))
            ->assertInertia(fn ($page) => $page->has('documents', 1));
    }
}
