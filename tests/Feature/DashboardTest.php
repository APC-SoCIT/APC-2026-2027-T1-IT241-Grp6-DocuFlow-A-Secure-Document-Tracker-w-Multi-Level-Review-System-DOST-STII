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

    private User $reyes;

    private User $cruz;

    private User $carlo;

    private User $teresa;

    private User $liza;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->reyes = User::where('email', 'l1.reyes@docuflow.test')->firstOrFail();     // Section A
        $this->cruz = User::where('email', 'l1.cruz@docuflow.test')->firstOrFail();       // Section B
        $this->carlo = User::where('email', 'l2@docuflow.test')->firstOrFail();           // Section A
        $this->teresa = User::where('email', 'l2.navarro@docuflow.test')->firstOrFail();  // Section B
        $this->liza = User::where('email', 'l3@docuflow.test')->firstOrFail();
    }

    private function submit(User $l1): Document
    {
        return app(WorkflowService::class)->submit($this->source, 'Memo', 'https://docs.google.com/document/d/x/edit', null, $l1->id);
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
        $pending = $this->submit($this->reyes);
        $returned = $this->submit($this->reyes);
        $approved = $this->submit($this->reyes);

        $this->act($this->reyes, $returned, ['action' => 'return', 'remarks' => 'Fix it.']);
        $this->act($this->reyes, $approved, ['action' => 'forward', 'l2_reviewer_id' => $this->carlo->id]);
        $this->act($this->carlo, $approved, ['action' => 'endorse']);
        $this->act($this->liza, $approved, ['action' => 'approve']);

        $dashboard = $this->dashboard($this->source);

        $this->assertSame('source', $dashboard['kind']);
        $this->assertSame([3, 1, 1, 1], [$dashboard['total'], $dashboard['in_review'], $dashboard['returned'], $dashboard['approved']]);
        $this->assertSame($dashboard['total'], $dashboard['in_review'] + $dashboard['returned'] + $dashboard['approved']);
        $this->assertSame(Document::where('submitted_by', $this->source->id)->count(), $dashboard['total']);
    }

    public function test_section_summary_counts_only_reviewers_in_the_same_section(): void
    {
        $a1 = $this->submit($this->reyes);   // Section A, New
        $a2 = $this->submit($this->reyes);   // Section A, will be Ongoing
        $b1 = $this->submit($this->cruz);    // Section B
        $this->actingAs($this->reyes)->get(route('documents.show', $a2));

        $dashboard = $this->dashboard($this->reyes);

        $this->assertSame('section', $dashboard['kind']);
        $this->assertSame('Section A summary', $dashboard['title']);
        $this->assertSame(2, $dashboard['queue']);
        $this->assertSame([1, 1, 2], [$dashboard['new'], $dashboard['ongoing'], $dashboard['pending']]);
        // Workload lists Section A reviewers only: Carlo (0) and Reyes (2).
        $this->assertSame(
            [['name' => 'Carlo Mendoza', 'count' => 0], ['name' => 'Jose Reyes', 'count' => 2]],
            collect($dashboard['workload'])->map(fn ($r) => ['name' => $r['name'], 'count' => $r['count']])->all(),
        );

        // The L2 in Section B sees Cruz's document, not Section A's.
        $section = $this->dashboard($this->teresa);
        $this->assertSame('Section B summary', $section['title']);
        $this->assertSame(0, $section['queue']);
        $this->assertSame(1, $section['pending']);
        $this->assertEqualsCanonicalizing(['Ana Cruz', 'Teresa Navarro'], collect($section['workload'])->pluck('name')->all());
    }

    public function test_averages_show_no_data_until_reviews_are_completed(): void
    {
        $this->submit($this->reyes);

        $dashboard = $this->dashboard($this->reyes);
        $this->assertNull($dashboard['average_tat']);
        $this->assertNull($dashboard['average_rating']);

        // Two completed reviews in Section A: 0 days (rating 5) and 6 days (rating 1).
        $fast = $this->submit($this->reyes);
        $this->act($this->reyes, $fast, ['action' => 'forward', 'l2_reviewer_id' => $this->carlo->id]);
        $slow = $this->submit($this->reyes);
        $this->travel(6)->days();
        $this->act($this->reyes, $slow, ['action' => 'return', 'remarks' => 'Fix it.']);

        $dashboard = $this->dashboard($this->reyes);
        $this->assertSame(3.0, (float) $dashboard['average_tat']);
        $this->assertSame(3.0, (float) $dashboard['average_rating']);

        // Section B has no completed reviews yet.
        $this->assertNull($this->dashboard($this->cruz)['average_rating']);
    }

    public function test_l3_sees_their_approval_queue_and_the_system_wide_summary(): void
    {
        $a = $this->submit($this->reyes);
        $this->submit($this->cruz);
        $this->act($this->reyes, $a, ['action' => 'forward', 'l2_reviewer_id' => $this->carlo->id]);
        $this->act($this->carlo, $a, ['action' => 'endorse']);

        $dashboard = $this->dashboard($this->liza);

        $this->assertSame('system', $dashboard['kind']);
        $this->assertSame(1, $dashboard['queue']);
        $this->assertSame(2, $dashboard['pending']);   // one with Liza, one with Cruz
        $this->assertCount(5, $dashboard['workload']); // every reviewer, both sections + L3
        $this->assertSame(5.0, (float) $dashboard['average_rating']);
    }

    public function test_new_and_ongoing_follow_the_reviewer_opening_and_hand_offs(): void
    {
        $document = $this->submit($this->reyes);
        $this->assertSame([1, 0], [$this->dashboard($this->reyes)['new'], $this->dashboard($this->reyes)['ongoing']]);

        $this->actingAs($this->reyes)->get(route('documents.show', $document));
        $this->assertSame([0, 1], [$this->dashboard($this->reyes)['new'], $this->dashboard($this->reyes)['ongoing']]);

        // Forwarded to Carlo (same section): New again.
        $this->act($this->reyes, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->carlo->id]);
        $dashboard = $this->dashboard($this->carlo);
        $this->assertSame([1, 0, 1], [$dashboard['new'], $dashboard['ongoing'], $dashboard['pending']]);
    }
}
