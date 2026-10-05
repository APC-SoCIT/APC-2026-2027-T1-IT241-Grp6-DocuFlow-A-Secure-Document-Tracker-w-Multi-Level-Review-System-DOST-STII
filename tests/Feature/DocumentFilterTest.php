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

    private User $l1;

    private User $l1b;

    private User $l2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->l1 = User::where('email', 'l1@docuflow.test')->firstOrFail();
        $this->l1b = User::where('email', 'l1b@docuflow.test')->firstOrFail();
        $this->l2 = User::where('email', 'l2@docuflow.test')->firstOrFail();
    }

    private function submit(string $type, ?User $submitter = null, ?User $l1 = null): Document
    {
        return app(WorkflowService::class)->submit(
            $submitter ?? $this->source,
            $type,
            null,
            "{$type} document",
            null,
            'https://docs.google.com/document/d/x/edit',
            null,
            ($l1 ?? $this->l1)->id,
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

    public function test_search_by_document_name_and_typed_other_type(): void
    {
        $memo = $this->submit('Memo');
        $memo->update(['document_name' => 'Office Relocation Memorandum']);
        $other = $this->submit('Other');
        $other->update(['document_type_other' => 'Equipment Inventory']);

        $this->assertSame([$memo->reference_number], $this->refs($this->source, ['search' => 'relocation']));
        $this->assertSame([$other->reference_number], $this->refs($this->source, ['search' => 'inventory']));
    }

    public function test_header_search_returns_quick_results_within_access(): void
    {
        $mine = $this->submit('Memo');
        $mine->update(['document_name' => 'Section A Leave Schedule']);
        // Submitted by Sofia to Carlo: the Document Source can't see it.
        $notMine = $this->submit('Memo', $this->l1, $this->l1b);
        $notMine->update(['document_name' => 'Section A Leave Plan']);

        $this->actingAs($this->source)->getJson(route('documents.search', ['search' => 'section a']))
            ->assertOk()
            ->assertJsonCount(1, 'documents')
            ->assertJsonPath('documents.0.reference_number', $mine->reference_number)
            ->assertJsonPath('documents.0.document_name', 'Section A Leave Schedule');

        // Same filters as the list.
        $this->actingAs($this->source)->getJson(route('documents.search', ['status' => Document::STATUS_RETURNED]))
            ->assertOk()
            ->assertJsonCount(0, 'documents');
    }

    public function test_status_and_date_submitted_filters(): void
    {
        $old = $this->submit('Memo');
        $old->update(['submitted_at' => now()->subDays(10)]);
        $returned = $this->submit('Report');
        $this->actingAs($this->l1)->post(route('reviews.store', $returned), [
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
        $bySofia = $this->submit('Memo', $this->l1, $this->l1b);   // Sofia submitted it
        $toSofia = $this->submit('Report');                             // assigned to Sofia

        $this->assertSame([$bySofia->reference_number], $this->refs($this->l1, ['role' => 'submitted']));
        $this->assertSame([$toSofia->reference_number], $this->refs($this->l1, ['role' => 'assigned']));
        $this->assertEqualsCanonicalizing(
            [$bySofia->reference_number, $toSofia->reference_number],
            $this->refs($this->l1),
        );

        // Only L1 and L2 get the role filter; others ignore it.
        $this->actingAs($this->l1)->get(route('documents.index'))
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
