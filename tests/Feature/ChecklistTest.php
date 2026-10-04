<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\Notification;
use App\Models\Review;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

/**
 * Task 2.7: checklist lines from PLAN.md not covered by the other tests.
 */
class ChecklistTest extends TestCase
{
    use RefreshDatabase;

    private User $source;

    private User $reyes;

    private User $carlo;

    private User $liza;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Storage::fake();

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->reyes = User::where('email', 'l1.reyes@docuflow.test')->firstOrFail();
        $this->carlo = User::where('email', 'l2@docuflow.test')->firstOrFail();
        $this->liza = User::where('email', 'l3@docuflow.test')->firstOrFail();
    }

    private function submitPayload(array $overrides = []): array
    {
        return [
            'document_type' => 'Memo',
            'source_type' => 'link',
            'google_workspace_link' => 'https://docs.google.com/document/d/x/edit',
            'l1_reviewer_id' => $this->reyes->id,
            ...$overrides,
        ];
    }

    private function breakNotifications(): void
    {
        $this->app->instance(NotificationService::class, new class extends NotificationService
        {
            public function notify(int $userId, Document $document, string $message): Notification
            {
                throw new RuntimeException('Simulated failure while saving.');
            }
        });
    }

    public function test_a_failed_submission_saves_nothing(): void
    {
        $this->breakNotifications();
        $this->withoutExceptionHandling();

        try {
            $this->actingAs($this->source)->post(route('documents.store'), $this->submitPayload());
            $this->fail('The simulated failure should have stopped the submission.');
        } catch (RuntimeException) {
            // expected
        }

        $this->assertSame(0, Document::count());
        $this->assertDatabaseCount('document_revisions', 0);
    }

    public function test_a_failed_review_leaves_the_document_in_its_previous_state(): void
    {
        $this->actingAs($this->source)->post(route('documents.store'), $this->submitPayload());
        $document = Document::firstOrFail();

        $this->breakNotifications();
        $this->withoutExceptionHandling();

        try {
            $this->actingAs($this->reyes)->post(route('reviews.store', $document), [
                'action' => 'forward', 'assessment' => 'OK', 'remarks' => 'OK', 'l2_reviewer_id' => $this->carlo->id,
            ]);
            $this->fail('The simulated failure should have stopped the review.');
        } catch (RuntimeException) {
            // expected
        }

        $document->refresh();
        $this->assertSame(Document::STATUS_PENDING_L1, $document->status);
        $this->assertSame($this->reyes->id, $document->assigned_reviewer_id);
        $this->assertSame(0, Review::count());
    }

    public function test_an_exe_file_is_rejected(): void
    {
        $this->actingAs($this->source)->post(route('documents.store'), $this->submitPayload([
            'source_type' => 'file',
            'file' => UploadedFile::fake()->create('setup.exe', 100, 'application/x-msdownload'),
        ]))->assertSessionHasErrors(['file' => 'The file must be a PDF, DOCX or XLSX file.']);

        $this->assertSame(0, Document::count());
    }

    public function test_approve_is_blocked_once_the_document_is_no_longer_pending_level_3(): void
    {
        $this->actingAs($this->source)->post(route('documents.store'), $this->submitPayload());
        $document = Document::firstOrFail();

        // Still at Level 1: the L3 can't approve it.
        $this->actingAs($this->liza)->post(route('reviews.store', $document), [
            'action' => 'approve', 'assessment' => 'OK', 'remarks' => 'OK',
        ])->assertSessionHas('error');
        $this->assertSame(Document::STATUS_PENDING_L1, $document->fresh()->status);
    }

    public function test_guests_are_sent_to_login(): void
    {
        foreach (['documents.index', 'reviews.index', 'documents.create', 'notifications.index'] as $route) {
            $this->get(route($route))->assertRedirect(route('login'));
        }
    }

    public function test_each_level_sees_only_its_own_review_card(): void
    {
        $this->actingAs($this->source)->post(route('documents.store'), $this->submitPayload());
        $document = Document::firstOrFail();

        $level = fn (User $user) => $this->actingAs($user)->get(route('documents.show', $document));

        $level($this->reyes)->assertInertia(fn ($page) => $page->where('review.level', 1)->has('review.l2Reviewers'));
        $level($this->source)->assertInertia(fn ($page) => $page->where('review', null));

        $this->actingAs($this->reyes)->post(route('reviews.store', $document), [
            'action' => 'forward', 'assessment' => 'OK', 'remarks' => 'OK', 'l2_reviewer_id' => $this->carlo->id,
        ]);
        $level($this->reyes)->assertInertia(fn ($page) => $page->where('review', null));
        $level($this->carlo)->assertInertia(fn ($page) => $page
            ->where('review.level', 2)
            ->where('review.l3ReviewerName', $this->liza->name));
    }
}
