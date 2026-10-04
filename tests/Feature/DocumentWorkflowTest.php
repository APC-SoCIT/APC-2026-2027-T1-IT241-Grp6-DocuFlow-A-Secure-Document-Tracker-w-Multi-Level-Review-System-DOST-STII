<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Every path of the two use cases: submit/resubmit and the three review levels.
 */
class DocumentWorkflowTest extends TestCase
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
        Storage::fake();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->reyes = User::where('email', 'l1.reyes@docuflow.test')->firstOrFail();
        $this->cruz = User::where('email', 'l1.cruz@docuflow.test')->firstOrFail();
        $this->sectionHead = User::where('email', 'l2@docuflow.test')->firstOrFail();
        $this->divisionChief = User::where('email', 'l3@docuflow.test')->firstOrFail();
    }

    private function submit(array $overrides = []): Document
    {
        $this->actingAs($this->source)->post(route('documents.store'), [
            'document_type' => 'Memo',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/abc123/edit',
            'l1_reviewer_id' => $this->reyes->id,
            ...$overrides,
        ])->assertSessionHasNoErrors();

        return Document::latest('id')->firstOrFail();
    }

    /** Post a review action; assessment and remarks are filled in unless given. */
    private function act(User $reviewer, Document $document, array $data)
    {
        return $this->actingAs($reviewer)->post(route('reviews.store', $document), [
            'assessment' => 'Meets the requirements for this level.',
            'remarks' => 'Reviewed.',
            ...$data,
        ]);
    }

    /** Drive a fresh document up to the given review level. */
    private function documentAtLevel(int $level): Document
    {
        $document = $this->submit();

        if ($level >= 2) {
            $this->act($this->reyes, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id]);
        }
        if ($level >= 3) {
            $this->act($this->sectionHead, $document, ['action' => 'endorse']);
        }

        return $document->fresh();
    }

    private function reviewerAt(int $level): User
    {
        return [1 => $this->reyes, 2 => $this->sectionHead, 3 => $this->divisionChief][$level];
    }

    public function test_full_path_submit_forward_endorse_approve(): void
    {
        $document = $this->submit();

        $this->assertMatchesRegularExpression('/^MEMO-\d{4}-00001$/', $document->reference_number);
        $this->assertSame(Document::STATUS_PENDING_L1, $document->status);
        $this->assertSame($this->reyes->id, $document->assigned_reviewer_id);
        $this->assertSame(1, $document->revisions()->count());
        $this->assertTrue($this->reyes->notifications()->where('document_id', $document->id)->exists());

        $this->act($this->reyes, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id])
            ->assertRedirect(route('reviews.index'));
        $document->refresh();
        $this->assertSame(Document::STATUS_PENDING_L2, $document->status);
        $this->assertSame($this->sectionHead->id, $document->assigned_reviewer_id);

        $this->act($this->sectionHead, $document, ['action' => 'endorse']);
        $document->refresh();
        $this->assertSame(Document::STATUS_PENDING_L3, $document->status);
        $this->assertSame($this->divisionChief->id, $document->assigned_reviewer_id);

        $this->act($this->divisionChief, $document, ['action' => 'approve']);
        $document->refresh();
        $this->assertSame(Document::STATUS_APPROVED, $document->status);
        $this->assertNull($document->assigned_reviewer_id);

        $this->assertSame(['forward', 'endorse', 'approve'], $document->reviews()->orderBy('id')->pluck('action')->all());
        $this->assertSame([5, 5, 5], $document->reviews()->orderBy('id')->pluck('rating')->all());
        $this->assertTrue($this->source->notifications()->where('message', 'like', '%approved%')->exists());
    }

    public function test_return_at_each_level_then_resubmit_goes_back_to_the_same_l1(): void
    {
        foreach ([1, 2, 3] as $level) {
            $document = $this->documentAtLevel($level);
            $reference = $document->reference_number;
            $dateSubmitted = $document->submitted_at;
            $this->assertNotNull($dateSubmitted);
            $this->assertSame(0, $document->resubmission_count);

            $this->travel(1)->days();

            $this->act($this->reviewerAt($level), $document, ['action' => 'return', 'remarks' => "Fix level {$level} issues."])
                ->assertSessionHasNoErrors();
            $document->refresh();
            $this->assertSame(Document::STATUS_RETURNED, $document->status, "returned at level {$level}");
            $this->assertTrue(
                $this->source->notifications()->where('document_id', $document->id)->where('message', 'like', '%returned%')->exists(),
            );

            $this->actingAs($this->source)->post(route('documents.resubmit', $document), [
                'source_type' => 'link',
                'google_workspace_link' => 'https://docs.google.com/document/d/abc123v2/edit',
                'change_note' => 'Addressed the remarks.',
            ])->assertSessionHasNoErrors();

            $document->refresh();
            $this->assertSame($reference, $document->reference_number, 'reference number never changes');
            $this->assertSame(Document::STATUS_PENDING_L1, $document->status);
            $this->assertSame(1, $document->current_review_level);
            $this->assertSame($this->reyes->id, $document->assigned_reviewer_id, "back to the same L1 after a level {$level} return");
            $this->assertSame(2, (int) $document->revisions()->max('revision_number'));
            $this->assertSame(1, $document->resubmission_count);
            $this->assertTrue($dateSubmitted->equalTo($document->submitted_at), 'Date Submitted never changes on resubmission');
            $this->assertTrue($document->revisions()->where('revision_number', 2)->value('created_at') > $dateSubmitted, 'the revision keeps its own resubmission date');

            $this->travelBack();
        }
    }

    public function test_return_requires_remarks(): void
    {
        $document = $this->submit();

        $this->act($this->reyes, $document, ['action' => 'return', 'remarks' => ''])->assertSessionHasErrors('remarks');
        $this->assertSame(Document::STATUS_PENDING_L1, $document->fresh()->status);

        // An assessment is optional when returning.
        $this->act($this->reyes, $document, ['action' => 'return', 'assessment' => '', 'remarks' => 'Fix section 2.'])
            ->assertSessionHasNoErrors();
        $this->assertSame(Document::STATUS_RETURNED, $document->fresh()->status);
    }

    public function test_forward_endorse_and_approve_require_an_assessment_and_remarks(): void
    {
        foreach ([1 => 'forward', 2 => 'endorse', 3 => 'approve'] as $level => $action) {
            $document = $this->documentAtLevel($level);
            $data = ['action' => $action, 'l2_reviewer_id' => $this->sectionHead->id];

            $this->act($this->reviewerAt($level), $document, [...$data, 'assessment' => ''])
                ->assertSessionHasErrors('assessment');
            $this->act($this->reviewerAt($level), $document, [...$data, 'remarks' => ''])
                ->assertSessionHasErrors('remarks');
            $this->assertSame($level, $document->fresh()->current_review_level, "{$action} was blocked");

            $this->act($this->reviewerAt($level), $document, [...$data, 'assessment' => 'Complete.', 'remarks' => 'Good to go.'])
                ->assertSessionHasNoErrors();
            $review = $document->reviews()->latest('id')->firstOrFail();
            $this->assertSame(['Complete.', 'Good to go.'], [$review->assessment, $review->remarks]);
        }
    }

    public function test_resubmit_screen_shows_the_latest_return_remarks(): void
    {
        $document = $this->submit();
        $this->act($this->reyes, $document, ['action' => 'return', 'remarks' => 'Add the budget table.']);

        $this->actingAs($this->source)->get(route('documents.resubmit.edit', $document))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Documents/Resubmit')
                ->where('document.reference_number', $document->reference_number)
                ->where('lastReturn.reviewer', $this->reyes->name)
                ->where('lastReturn.remarks', 'Add the budget table.'));
    }

    public function test_forward_requires_a_real_l2(): void
    {
        $document = $this->submit();

        $this->act($this->reyes, $document, ['action' => 'forward'])->assertSessionHasErrors('l2_reviewer_id');
        $this->act($this->reyes, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->divisionChief->id])
            ->assertSessionHasErrors('l2_reviewer_id');
    }

    public function test_actions_are_limited_to_the_review_level(): void
    {
        $document = $this->documentAtLevel(1);
        $this->act($this->reyes, $document, ['action' => 'approve'])->assertSessionHasErrors('action');

        $document = $this->documentAtLevel(2);
        $this->act($this->sectionHead, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id])
            ->assertSessionHasErrors('action');

        $document = $this->documentAtLevel(3);
        $this->act($this->divisionChief, $document, ['action' => 'endorse'])->assertSessionHasErrors('action');
    }

    public function test_self_review_is_blocked(): void
    {
        // A submitter can't pick themself as reviewer.
        $this->actingAs($this->source)->post(route('documents.store'), [
            'document_type' => 'Memo',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/abc/edit',
            'l1_reviewer_id' => $this->source->id,
        ])->assertSessionHasErrors(['l1_reviewer_id' => 'Self-Review Restriction: you cannot select yourself as reviewer.']);

        // A reviewer can't review a document they submitted.
        $document = $this->submit();
        $document->update(['submitted_by' => $this->reyes->id]);

        $this->act($this->reyes, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id])
            ->assertSessionHas('error', "Self-Review Restriction: you can't review {$document->reference_number} because you submitted it.");
        $this->assertSame(Document::STATUS_PENDING_L1, $document->fresh()->status);
    }

    public function test_l1_and_l2_can_submit_but_the_l3_cannot(): void
    {
        $otherL2 = User::where('email', 'l2.navarro@docuflow.test')->firstOrFail();
        $store = fn (User $submitter, User $l1) => $this->actingAs($submitter)->post(route('documents.store'), [
            'document_type' => 'Report',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/l1l2/edit',
            'l1_reviewer_id' => $l1->id,
        ]);

        // An L1 submits to the other L1, never to themself.
        $this->actingAs($this->reyes)->get(route('documents.create'))->assertOk();
        $store($this->reyes, $this->reyes)->assertSessionHasErrors('l1_reviewer_id');
        $store($this->reyes, $this->cruz)->assertSessionHasNoErrors();
        $byReyes = Document::latest('id')->firstOrFail();
        $this->assertSame($this->reyes->id, $byReyes->submitted_by);
        $this->assertSame($this->cruz->id, $byReyes->assigned_reviewer_id);

        // An L2's own document can't be forwarded to them, only to the other L2.
        $store($this->sectionHead, $this->reyes)->assertSessionHasNoErrors();
        $byCarlo = Document::latest('id')->firstOrFail();
        $this->actingAs($this->reyes)->get(route('documents.show', $byCarlo))
            ->assertInertia(fn ($page) => $page
                ->has('review.l2Reviewers', 1)
                ->where('review.l2Reviewers.0.id', $otherL2->id));
        $this->act($this->reyes, $byCarlo, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id])
            ->assertSessionHasErrors('l2_reviewer_id');
        $this->act($this->reyes, $byCarlo, ['action' => 'forward', 'l2_reviewer_id' => $otherL2->id])
            ->assertSessionHasNoErrors();
        $this->assertSame($otherL2->id, $byCarlo->fresh()->assigned_reviewer_id);

        // The L3 can't submit.
        $this->actingAs($this->divisionChief)->get(route('documents.create'))
            ->assertRedirect(route('reviews.index'))
            ->assertSessionHas('error', 'Only a Document Source, Immediate Supervisor (L1) or Section Head (L2) can submit documents.');
        $store($this->divisionChief, $this->reyes)->assertSessionHas('error');
    }

    public function test_only_the_assigned_reviewer_can_act(): void
    {
        $document = $this->submit();

        $this->act($this->cruz, $document, ['action' => 'return', 'remarks' => 'x'])
            ->assertSessionHas('error', "{$document->reference_number} is not assigned to you for review.");
        $this->act($this->source, $document, ['action' => 'return', 'remarks' => 'x'])
            ->assertSessionHas('error');
        $this->assertSame(Document::STATUS_PENDING_L1, $document->fresh()->status);
    }

    public function test_cannot_resubmit_a_document_that_is_not_returned(): void
    {
        $document = $this->submit();

        $this->actingAs($this->source)->post(route('documents.resubmit', $document), [
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/x/edit',
            'change_note' => 'x',
        ])->assertSessionHas('error', "{$document->reference_number} can only be resubmitted after it is returned. Its status is Pending Level 1 Review.");

        $this->assertSame(1, $document->revisions()->count());
    }

    public function test_resubmission_requires_a_change_note(): void
    {
        $document = $this->submit();
        $this->act($this->reyes, $document, ['action' => 'return', 'remarks' => 'Fix it.']);

        $this->actingAs($this->source)->post(route('documents.resubmit', $document), [
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/x/edit',
        ])->assertSessionHasErrors('change_note');
    }

    public function test_upload_rules(): void
    {
        $post = fn (array $data) => $this->actingAs($this->source)->post(route('documents.store'), [
            'document_type' => 'Report',
            'l1_reviewer_id' => $this->reyes->id,
            ...$data,
        ]);

        $post(['source_type' => 'file', 'file' => UploadedFile::fake()->create('report.pdf', 500, 'application/pdf')])
            ->assertSessionHasNoErrors();
        $this->assertNotNull(Document::latest('id')->first()->file_path);

        $post(['source_type' => 'file', 'file' => UploadedFile::fake()->create('notes.txt', 5, 'text/plain')])
            ->assertSessionHasErrors('file');
        $post(['source_type' => 'file', 'file' => UploadedFile::fake()->create('big.pdf', 10241, 'application/pdf')])
            ->assertSessionHasErrors(['file' => 'The file must be 10 MB or smaller.']);
        $post(['source_type' => 'link', 'google_workspace_link' => 'https://example.com/doc'])
            ->assertSessionHasErrors('google_workspace_link');
        $post(['source_type' => 'link', 'google_workspace_link' => 'https://drive.google.com/file/d/xyz/view'])
            ->assertSessionHasErrors('google_workspace_link');
        $post(['source_type' => 'link', 'google_workspace_link' => 'https://docs.google.com/spreadsheets/d/xyz/edit'])
            ->assertSessionHasNoErrors();
    }

    public function test_reference_numbers_count_up_per_type(): void
    {
        $year = now()->year;

        $this->assertSame("MEMO-{$year}-00001", $this->submit()->reference_number);
        $this->assertSame("MEMO-{$year}-00002", $this->submit()->reference_number);
        $this->assertSame("POLICY-{$year}-00001", $this->submit(['document_type' => 'Policy Draft'])->reference_number);
    }

    public function test_tat_rating_is_5_before_day_5_then_3_on_day_5_then_1_after(): void
    {
        foreach ([4 => 5, 5 => 3, 6 => 1] as $days => $expectedRating) {
            $document = $this->submit();

            $this->travel($days)->days();
            $this->act($this->reyes, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->sectionHead->id]);
            $this->travelBack();

            $review = $document->reviews()->latest('id')->firstOrFail();
            $this->assertSame($days, $review->tat_days);
            $this->assertSame($expectedRating, $review->rating, "rating after {$days} days");
        }
    }

    public function test_only_people_involved_can_open_a_document(): void
    {
        $document = $this->submit();

        $this->actingAs($this->source)->get(route('documents.show', $document))->assertOk();
        $this->actingAs($this->reyes)->get(route('documents.show', $document))->assertOk();
        $this->actingAs($this->cruz)->get(route('documents.show', $document))
            ->assertRedirect(route('reviews.index'))
            ->assertSessionHas('error');
    }

    public function test_notifications_can_be_read_only_by_their_owner(): void
    {
        $document = $this->submit();
        $notification = Notification::where('user_id', $this->reyes->id)->firstOrFail();

        $this->actingAs($this->cruz)->post(route('notifications.read', $notification))->assertSessionHas('error');
        $this->assertFalse($notification->fresh()->is_read);

        $this->actingAs($this->reyes)->post(route('notifications.read', $notification))
            ->assertRedirect(route('documents.show', $document));
        $this->assertTrue($notification->fresh()->is_read);
    }
}
