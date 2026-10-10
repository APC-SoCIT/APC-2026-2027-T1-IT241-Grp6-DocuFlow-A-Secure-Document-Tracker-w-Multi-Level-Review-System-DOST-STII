<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The migration that matches revisions and reviews to the ERD converts
 * documents saved the old way: revision 1 made at the first submission,
 * resubmissions replacing the link on the document row, and every review
 * pointing at the document.
 */
class MatchRevisionsAndReviewsToTheErdMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const MIGRATION = 'migrations/2026_10_10_000001_match_revisions_and_reviews_to_the_erd.php';

    public function test_old_documents_are_converted_and_the_migration_can_be_rolled_back(): void
    {
        $this->seed();
        $migration = require database_path(self::MIGRATION);
        $source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $l1 = User::where('email', 'l1@docuflow.test')->firstOrFail();
        $l2 = User::where('email', 'l2@docuflow.test')->firstOrFail();

        // Back to the old shape.
        $migration->down();
        $this->assertTrue(Schema::hasColumn('documents', 'resubmission_count'));
        $this->assertFalse(Schema::hasColumn('reviews', 'revision_id'));

        // Never resubmitted: revision 1 from the submission, one review.
        $new = $this->oldDocument('MEMO-2026-00001', $source, 'https://docs.google.com/document/d/a/edit', 0);
        $this->oldRevision($new, $source, 1, null);
        $newReview = $this->oldReview($new, $l1, 1, 'forward');

        // Resubmitted twice: revisions 1 (the submission), 2 and 3; the row holds the latest link.
        $twice = $this->oldDocument('MEMO-2026-00002', $source, 'https://docs.google.com/document/d/b-v3/edit', 2);
        $this->oldRevision($twice, $source, 1, null);
        $first = $this->oldRevision($twice, $source, 2, 'Added the table.');
        $second = $this->oldRevision($twice, $source, 3, 'Fixed the totals.');
        $reviews = [
            $this->oldReview($twice, $l1, 1, 'return'),  // of the original
            $this->oldReview($twice, $l1, 1, 'forward'), // of the first resubmission
            $this->oldReview($twice, $l2, 2, 'return'),  // of the first resubmission
            $this->oldReview($twice, $l1, 1, 'forward'), // of the second resubmission
        ];

        $migration->up();
        $this->assertErdShape($new, $newReview, $twice, $first, $second, $reviews);

        // Rolling back restores the old shape.
        $migration->down();
        $this->assertEquals(2, DB::table('documents')->where('id', $twice)->value('resubmission_count'));
        $this->assertEquals([1, 2, 3], DB::table('document_revisions')->where('document_id', $twice)->orderBy('revision_number')->pluck('revision_number')->all());
        $this->assertEquals(1, DB::table('document_revisions')->where('document_id', $new)->count());
        $this->assertEquals([$twice], DB::table('reviews')->whereIn('id', $reviews)->pluck('document_id')->unique()->values()->all());
        $this->assertSame('https://docs.google.com/document/d/b-v3/edit', DB::table('documents')->where('id', $twice)->value('google_workspace_link'));

        // And migrating again gives the same result.
        $migration->up();
        $this->assertErdShape($new, $newReview, $twice, $first, $second, $reviews);
    }

    /**
     * @param  list<int>  $reviews
     */
    private function assertErdShape(int $new, int $newReview, int $twice, int $first, int $second, array $reviews): void
    {
        $this->assertFalse(Schema::hasColumn('documents', 'resubmission_count'));

        // Never resubmitted: no revisions, and the review is of the original.
        $this->assertSame(0, DB::table('document_revisions')->where('document_id', $new)->count());
        $review = DB::table('reviews')->find($newReview);
        $this->assertEquals([$new, null], [$review->document_id, $review->revision_id]);

        // Resubmitted twice: revisions 1 and 2, with their change notes; the latest holds the link.
        $revisions = DB::table('document_revisions')->where('document_id', $twice)->orderBy('revision_number')->get();
        $this->assertEquals([$first, $second], $revisions->pluck('id')->all());
        $this->assertEquals([1, 2], $revisions->pluck('revision_number')->all());
        $this->assertSame(['Added the table.', 'Fixed the totals.'], $revisions->pluck('change_note')->all());
        $this->assertNull($revisions[0]->google_workspace_link);
        $this->assertSame('https://docs.google.com/document/d/b-v3/edit', $revisions[1]->google_workspace_link);

        // Each review is of exactly one submission: the original, then each revision.
        $this->assertEquals(
            [[$twice, null], [null, $first], [null, $first], [null, $second]],
            DB::table('reviews')->whereIn('id', $reviews)->orderBy('id')->get()
                ->map(fn ($r) => [$r->document_id, $r->revision_id])->all(),
        );
    }

    private function oldDocument(string $reference, User $submitter, string $link, int $resubmissions): int
    {
        return DB::table('documents')->insertGetId([
            'reference_number' => $reference,
            'document_type' => 'Memo',
            'google_workspace_link' => $link,
            'status' => 'pending_l1_review',
            'submitted_by' => $submitter->id,
            'submitted_at' => now(),
            'resubmission_count' => $resubmissions,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function oldRevision(int $documentId, User $submitter, int $number, ?string $changeNote): int
    {
        return DB::table('document_revisions')->insertGetId([
            'document_id' => $documentId,
            'revision_number' => $number,
            'change_note' => $changeNote,
            'submitted_by' => $submitter->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function oldReview(int $documentId, User $reviewer, int $level, string $action): int
    {
        return DB::table('reviews')->insertGetId([
            'document_id' => $documentId,
            'reviewer_id' => $reviewer->id,
            'review_level' => $level,
            'remarks' => 'Reviewed.',
            'action' => $action,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
