<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use App\Services\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 2.5: dashboard summaries (stories #1, #6, #8, #10).
 */
class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $source;

    private User $l1;

    private User $l1b;

    private User $l2;

    private User $l2b;

    private User $l3;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->l1 = User::where('email', 'l1@docuflow.test')->firstOrFail();
        $this->l1b = User::where('email', 'l1b@docuflow.test')->firstOrFail();
        $this->l2 = User::where('email', 'l2@docuflow.test')->firstOrFail();
        $this->l2b = User::where('email', 'l2b@docuflow.test')->firstOrFail();
        $this->l3 = User::where('email', 'l3@docuflow.test')->firstOrFail();
    }

    private function submit(User $l1): Document
    {
        return app(WorkflowService::class)->submit($this->source, 'Memo', null, null, 'https://docs.google.com/document/d/x/edit', null, $l1->id);
    }

    private function act(User $reviewer, Document $document, array $data): void
    {
        $this->actingAs($reviewer)->post(route('reviews.store', $document), [
            'assessment' => 'Meets the requirements.',
            'remarks' => 'Reviewed.',
            ...$data,
        ])->assertSessionHasNoErrors();
    }

    /** @return array<string, mixed> */
    private function dashboard(User $user): array
    {
        $dashboard = [];
        $this->actingAs($user)->get(route('documents.index'))
            ->assertOk()
            ->assertInertia(function ($page) use (&$dashboard) {
                $dashboard = $page->toArray()['props']['dashboard'];
            });

        return $dashboard;
    }

    public function test_document_source_numbers_match_their_list(): void
    {
        $pending = $this->submit($this->l1);
        $returned = $this->submit($this->l1);
        $approved = $this->submit($this->l1);

        $this->act($this->l1, $returned, ['action' => 'return', 'remarks' => 'Fix it.']);
        $this->act($this->l1, $approved, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);
        $this->act($this->l2, $approved, ['action' => 'endorse']);
        $this->act($this->l3, $approved, ['action' => 'approve']);

        $dashboard = $this->dashboard($this->source);

        $this->assertSame('source', $dashboard['kind']);
        $this->assertSame([3, 1, 1, 1], [$dashboard['total'], $dashboard['in_review'], $dashboard['returned'], $dashboard['approved']]);
        $this->assertSame($dashboard['total'], $dashboard['in_review'] + $dashboard['returned'] + $dashboard['approved']);
        $this->assertSame(Document::where('submitted_by', $this->source->id)->count(), $dashboard['total']);
    }

    /** A reviewer in another section, to prove other sections aren't counted. */
    private function reviewerInAnotherSection(): User
    {
        return User::factory()->create(['name' => 'Other Section L1', 'role' => User::ROLE_L1, 'section' => 'Section B']);
    }

    public function test_section_summary_counts_only_reviewers_in_the_same_section(): void
    {
        $other = $this->reviewerInAnotherSection();

        $this->submit($this->l1);                  // Sofia, New
        $opened = $this->submit($this->l1);        // Sofia, will be Ongoing
        $this->submit($this->l1b);                 // Carlo (same section), New
        $this->submit($other);                     // another section: not counted
        $this->actingAs($this->l1)->get(route('documents.show', $opened));

        $dashboard = $this->dashboard($this->l1);

        $this->assertSame('section', $dashboard['kind']);
        $this->assertSame('Section A summary', $dashboard['title']);
        $this->assertSame(2, $dashboard['queue']);
        $this->assertSame([2, 1, 3], [$dashboard['new'], $dashboard['ongoing'], $dashboard['pending']]);
        // Workload lists the section's reviewers only (both L1s and both L2s).
        $this->assertSame(
            [
                ['name' => 'Beejay Carpio', 'count' => 0],
                ['name' => 'Carlo Baracena', 'count' => 1],
                ['name' => 'Nairb Varona', 'count' => 0],
                ['name' => 'Sofia Padua', 'count' => 2],
            ],
            collect($dashboard['workload'])->map(fn ($r) => ['name' => $r['name'], 'count' => $r['count']])->all(),
        );

        // The other section's reviewer sees only their own section.
        $section = $this->dashboard($other);
        $this->assertSame('Section B summary', $section['title']);
        $this->assertSame([1, 1], [$section['queue'], $section['pending']]);
        $this->assertSame(['Other Section L1'], collect($section['workload'])->pluck('name')->all());
    }

    public function test_averages_show_no_data_until_reviews_are_completed(): void
    {
        $this->submit($this->l1);

        $dashboard = $this->dashboard($this->l1);
        $this->assertNull($dashboard['average_tat']);
        $this->assertNull($dashboard['average_rating']);

        // Two completed reviews in the section: 0 days (rating 5) and 6 days (rating 1).
        $fast = $this->submit($this->l1);
        $this->act($this->l1, $fast, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);
        $slow = $this->submit($this->l1);
        $this->travel(6)->days();
        $this->act($this->l1, $slow, ['action' => 'return', 'remarks' => 'Fix it.']);

        $dashboard = $this->dashboard($this->l1);
        $this->assertSame(3.0, (float) $dashboard['average_tat']);
        $this->assertSame(3.0, (float) $dashboard['average_rating']);

        // Another section has no completed reviews yet.
        $this->assertNull($this->dashboard($this->reviewerInAnotherSection())['average_rating']);
    }

    public function test_l3_sees_their_approval_queue_and_the_system_wide_summary(): void
    {
        $a = $this->submit($this->l1);
        $this->submit($this->l1b);
        $this->act($this->l1, $a, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);
        $this->act($this->l2, $a, ['action' => 'endorse']);

        $dashboard = $this->dashboard($this->l3);

        $this->assertSame('system', $dashboard['kind']);
        $this->assertSame(1, $dashboard['queue']);
        $this->assertSame(2, $dashboard['pending']);   // one with RomeoJr, one with Carlo
        $this->assertCount(5, $dashboard['workload']); // every reviewer: both L1s, both L2s and the L3
        $this->assertSame(5.0, (float) $dashboard['average_rating']);
    }

    public function test_new_and_ongoing_follow_the_reviewer_opening_and_hand_offs(): void
    {
        $document = $this->submit($this->l1);
        $this->assertSame([1, 0], [$this->dashboard($this->l1)['new'], $this->dashboard($this->l1)['ongoing']]);

        $this->actingAs($this->l1)->get(route('documents.show', $document));
        $this->assertSame([0, 1], [$this->dashboard($this->l1)['new'], $this->dashboard($this->l1)['ongoing']]);

        // Forwarded to Nairb (same section): New again.
        $this->act($this->l1, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);
        $dashboard = $this->dashboard($this->l2);
        $this->assertSame([1, 0, 1], [$dashboard['new'], $dashboard['ongoing'], $dashboard['pending']]);
    }
}
