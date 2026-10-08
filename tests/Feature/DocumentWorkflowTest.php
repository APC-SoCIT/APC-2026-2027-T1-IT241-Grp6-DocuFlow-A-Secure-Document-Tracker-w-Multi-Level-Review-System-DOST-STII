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

    private User $l1;

    private User $l1b;

    private User $l2;

    private User $l3;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Storage::fake();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->l1 = User::where('email', 'l1@docuflow.test')->firstOrFail();
        $this->l1b = User::where('email', 'l1b@docuflow.test')->firstOrFail();
        $this->l2 = User::where('email', 'l2@docuflow.test')->firstOrFail();
        $this->l3 = User::where('email', 'l3@docuflow.test')->firstOrFail();
    }

    private function submit(array $overrides = []): Document
    {
        $this->actingAs($this->source)->post(route('documents.store'), [
            'document_type' => 'Memo',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/abc123/edit',
            'l1_reviewer_id' => $this->l1->id,
            ...$overrides,
        ])->assertSessionHasNoErrors();

        return Document::latest('id')->firstOrFail();
    }

    /** Post a review action; remarks are filled in unless given. */
    private function act(User $reviewer, Document $document, array $data)
    {
        return $this->actingAs($reviewer)->post(route('reviews.store', $document), [
            'remarks' => 'Reviewed.',
            ...$data,
        ]);
    }

    /** Drive a fresh document up to the given review level. */
    private function documentAtLevel(int $level): Document
    {
        $document = $this->submit();

        if ($level >= 2) {
            $this->act($this->l1, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);
        }
        if ($level >= 3) {
            $this->act($this->l2, $document, ['action' => 'endorse']);
        }

        return $document->fresh();
    }

    private function reviewerAt(int $level): User
    {
        return [1 => $this->l1, 2 => $this->l2, 3 => $this->l3][$level];
    }

    public function test_full_path_submit_forward_endorse_approve(): void
    {
        $document = $this->submit();

        $this->assertMatchesRegularExpression('/^MEMO-\d{4}-00001$/', $document->reference_number);
        $this->assertSame(Document::STATUS_PENDING_L1, $document->status);
        $this->assertSame($this->l1->id, $document->assigned_reviewer_id);
        $this->assertSame(1, $document->revisions()->count());
        $this->assertTrue($this->l1->notifications()->where('document_id', $document->id)->exists());

        $this->act($this->l1, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id])
            ->assertRedirect(route('reviews.index'));
        $document->refresh();
        $this->assertSame(Document::STATUS_PENDING_L2, $document->status);
        $this->assertSame($this->l2->id, $document->assigned_reviewer_id);

        $this->act($this->l2, $document, ['action' => 'endorse']);
        $document->refresh();
        $this->assertSame(Document::STATUS_PENDING_L3, $document->status);
        $this->assertSame($this->l3->id, $document->assigned_reviewer_id);

        $this->act($this->l3, $document, ['action' => 'approve']);
        $document->refresh();
        $this->assertSame(Document::STATUS_APPROVED, $document->status);
        $this->assertNull($document->assigned_reviewer_id);

        $this->assertSame(['forward', 'endorse', 'approve'], $document->reviews()->orderBy('id')->pluck('action')->all());
        $this->assertSame([0, 0, 0], $document->reviews()->orderBy('id')->pluck('tat_days')->all());
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
            $this->assertSame($this->l1->id, $document->assigned_reviewer_id, "back to the same L1 after a level {$level} return");
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

        $this->act($this->l1, $document, ['action' => 'return', 'remarks' => ''])->assertSessionHasErrors('remarks');
        $this->assertSame(Document::STATUS_PENDING_L1, $document->fresh()->status);

        $this->act($this->l1, $document, ['action' => 'return', 'remarks' => 'Fix section 2.'])
            ->assertSessionHasNoErrors();
        $this->assertSame(Document::STATUS_RETURNED, $document->fresh()->status);
    }

    public function test_forward_endorse_and_approve_require_official_remarks(): void
    {
        foreach ([1 => 'forward', 2 => 'endorse', 3 => 'approve'] as $level => $action) {
            $document = $this->documentAtLevel($level);
            $data = ['action' => $action, 'l2_reviewer_id' => $this->l2->id];

            $this->act($this->reviewerAt($level), $document, [...$data, 'remarks' => ''])
                ->assertSessionHasErrors('remarks');
            $this->assertSame($level, $document->fresh()->current_review_level, "{$action} was blocked");

            $this->act($this->reviewerAt($level), $document, [...$data, 'remarks' => 'Good to go.'])
                ->assertSessionHasNoErrors();
            $this->assertSame('Good to go.', $document->reviews()->latest('id')->firstOrFail()->remarks);
        }
    }

    public function test_resubmit_screen_shows_the_latest_return_remarks(): void
    {
        $document = $this->submit();
        $this->act($this->l1, $document, ['action' => 'return', 'remarks' => 'Add the budget table.']);

        $this->actingAs($this->source)->get(route('documents.resubmit.edit', $document))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Documents/Resubmit')
                ->where('document.reference_number', $document->reference_number)
                ->where('lastReturn.reviewer', $this->l1->name)
                ->where('lastReturn.remarks', 'Add the budget table.'));
    }

    public function test_forward_requires_a_real_l2(): void
    {
        $document = $this->submit();

        $this->act($this->l1, $document, ['action' => 'forward'])->assertSessionHasErrors('l2_reviewer_id');
        $this->act($this->l1, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->l3->id])
            ->assertSessionHasErrors('l2_reviewer_id');
    }

    public function test_actions_are_limited_to_the_review_level(): void
    {
        $document = $this->documentAtLevel(1);
        $this->act($this->l1, $document, ['action' => 'approve'])->assertSessionHasErrors('action');

        $document = $this->documentAtLevel(2);
        $this->act($this->l2, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id])
            ->assertSessionHasErrors('action');

        $document = $this->documentAtLevel(3);
        $this->act($this->l3, $document, ['action' => 'endorse'])->assertSessionHasErrors('action');
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
        $document->update(['submitted_by' => $this->l1->id]);

        $this->act($this->l1, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id])
            ->assertSessionHas('error', "Self-Review Restriction: you can't review {$document->reference_number} because you submitted it.");
        $this->assertSame(Document::STATUS_PENDING_L1, $document->fresh()->status);
    }

    public function test_l1_and_l2_can_submit_but_the_l3_cannot(): void
    {
        $otherL2 = User::where('email', 'l2b@docuflow.test')->firstOrFail();
        $store = fn (User $submitter, User $l1) => $this->actingAs($submitter)->post(route('documents.store'), [
            'document_type' => 'Report',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/l1l2/edit',
            'l1_reviewer_id' => $l1->id,
        ]);

        // An L1 submits to the other L1, never to themself.
        $this->actingAs($this->l1)->get(route('documents.create'))->assertOk();
        $store($this->l1, $this->l1)->assertSessionHasErrors('l1_reviewer_id');
        $store($this->l1, $this->l1b)->assertSessionHasNoErrors();
        $bySofia = Document::latest('id')->firstOrFail();
        $this->assertSame($this->l1->id, $bySofia->submitted_by);
        $this->assertSame($this->l1b->id, $bySofia->assigned_reviewer_id);

        // An L2's own document can't be forwarded to them, only to the other L2.
        $store($this->l2, $this->l1)->assertSessionHasNoErrors();
        $byCarlo = Document::latest('id')->firstOrFail();
        $this->actingAs($this->l1)->get(route('documents.show', $byCarlo))
            ->assertInertia(fn ($page) => $page
                ->has('review.l2Reviewers', 1)
                ->where('review.l2Reviewers.0.id', $otherL2->id));
        $this->act($this->l1, $byCarlo, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id])
            ->assertSessionHasErrors('l2_reviewer_id');
        $this->act($this->l1, $byCarlo, ['action' => 'forward', 'l2_reviewer_id' => $otherL2->id])
            ->assertSessionHasNoErrors();
        $this->assertSame($otherL2->id, $byCarlo->fresh()->assigned_reviewer_id);

        // The L3 can't submit.
        $this->actingAs($this->l3)->get(route('documents.create'))
            ->assertRedirect(route('reviews.index'))
            ->assertSessionHas('error', 'Only a Document Source, Immediate Supervisor (L1) or Section Head (L2) can submit documents.');
        $store($this->l3, $this->l1)->assertSessionHas('error');
    }

    public function test_only_the_assigned_reviewer_can_act(): void
    {
        $document = $this->submit();

        $this->act($this->l1b, $document, ['action' => 'return', 'remarks' => 'x'])
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
        $this->act($this->l1, $document, ['action' => 'return', 'remarks' => 'Fix it.']);

        $this->actingAs($this->source)->post(route('documents.resubmit', $document), [
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/x/edit',
        ])->assertSessionHasErrors('change_note');
    }

    public function test_upload_rules(): void
    {
        $post = fn (array $data) => $this->actingAs($this->source)->post(route('documents.store'), [
            'document_type' => 'Report',
            'l1_reviewer_id' => $this->l1->id,
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

    public function test_other_needs_its_type_typed_and_description_is_optional(): void
    {
        $post = fn (array $data) => $this->actingAs($this->source)->post(route('documents.store'), [
            'document_type' => 'Memo',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/x/edit',
            'l1_reviewer_id' => $this->l1->id,
            ...$data,
        ]);

        $post(['document_type' => 'Other'])
            ->assertSessionHasErrors(['document_type_other' => 'Type what kind of document this is.']);

        $post([
            'document_type' => 'Other',
            'document_type_other' => 'Equipment Inventory',
            'description' => 'Laboratory equipment on hand.',
        ])->assertSessionHasNoErrors();
        $document = Document::latest('id')->firstOrFail();
        $this->assertSame('Laboratory equipment on hand.', $document->description);
        $this->assertSame('Equipment Inventory', $document->typeLabel());
        // The reference number still uses the fixed type.
        $this->assertStringStartsWith('OTHER-', $document->reference_number);

        // The typed type is only kept for "Other"; no description is fine.
        $post(['document_type' => 'Memo', 'document_type_other' => 'Ignored'])->assertSessionHasNoErrors();
        $document = Document::latest('id')->firstOrFail();
        $this->assertNull($document->document_type_other);
        $this->assertNull($document->description);
    }

    public function test_reference_numbers_count_up_per_type(): void
    {
        $year = now()->year;

        $this->assertSame("MEMO-{$year}-00001", $this->submit()->reference_number);
        $this->assertSame("MEMO-{$year}-00002", $this->submit()->reference_number);
        $this->assertSame("POLICY-{$year}-00001", $this->submit(['document_type' => 'Policy Draft'])->reference_number);
    }

    public function test_tat_is_the_calendar_days_from_assignment_to_the_review_action(): void
    {
        foreach ([4, 5, 6] as $days) {
            $document = $this->submit();

            $this->travel($days)->days();
            $this->act($this->l1, $document, ['action' => 'forward', 'l2_reviewer_id' => $this->l2->id]);
            $this->travelBack();

            $review = $document->reviews()->latest('id')->firstOrFail();
            $this->assertSame($days, $review->tat_days, "TAT after {$days} days");
        }
    }

    public function test_only_people_involved_can_open_a_document(): void
    {
        $document = $this->submit();

        $this->actingAs($this->source)->get(route('documents.show', $document))->assertOk();
        $this->actingAs($this->l1)->get(route('documents.show', $document))->assertOk();
        $this->actingAs($this->l1b)->get(route('documents.show', $document))
            ->assertRedirect(route('reviews.index'))
            ->assertSessionHas('error');
    }

    public function test_bell_popover_lists_recent_notifications_and_unread_count(): void
    {
        $this->submit();
        $this->submit();

        $this->actingAs($this->l1)->getJson(route('notifications.recent'))
            ->assertOk()
            ->assertJsonPath('unread', 2)
            ->assertJsonCount(2, 'notifications');
        // Another account sees none of them.
        $this->actingAs($this->l1b)->getJson(route('notifications.recent'))
            ->assertOk()
            ->assertJsonPath('unread', 0)
            ->assertJsonCount(0, 'notifications');

        // Mark all as read returns to the page it was clicked on.
        $this->actingAs($this->l1)->from(route('reviews.index'))->post(route('notifications.read-all'))
            ->assertRedirect(route('reviews.index'));
        $this->actingAs($this->l1)->getJson(route('notifications.recent'))->assertJsonPath('unread', 0);
    }

    public function test_notifications_can_be_read_only_by_their_owner(): void
    {
        $document = $this->submit();
        $notification = Notification::where('user_id', $this->l1->id)->firstOrFail();

        $this->actingAs($this->l1b)->post(route('notifications.read', $notification))->assertSessionHas('error');
        $this->assertFalse($notification->fresh()->is_read);

        $this->actingAs($this->l1)->post(route('notifications.read', $notification))
            ->assertRedirect(route('documents.show', $document));
        $this->assertTrue($notification->fresh()->is_read);
    }
}
