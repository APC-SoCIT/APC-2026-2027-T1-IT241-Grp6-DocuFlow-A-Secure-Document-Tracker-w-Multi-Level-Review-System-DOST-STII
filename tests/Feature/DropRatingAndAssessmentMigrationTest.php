<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The migration that drops reviews.rating and reviews.assessment keeps any
 * assessment already written by moving it into that review's remarks.
 */
class DropRatingAndAssessmentMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_existing_assessments_move_into_the_remarks_before_the_columns_are_dropped(): void
    {
        $this->seed();
        $migration = require database_path('migrations/2026_10_08_000001_drop_rating_and_assessment_from_reviews_table.php');

        // Back to the old table, with reviews saved the old way.
        $migration->down();
        $this->assertTrue(Schema::hasColumns('reviews', ['assessment', 'rating']));

        $source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $l1 = User::where('email', 'l1@docuflow.test')->firstOrFail();
        $document = app(WorkflowService::class)->submit($source, 'Memo', null, null, 'https://docs.google.com/document/d/x/edit', null, $l1->id);
        // One review per level for each submission, so each row is at its own level.
        $row = ['document_id' => $document->id, 'reviewer_id' => $l1->id, 'tat_days' => 2, 'rating' => 5];
        $both = DB::table('reviews')->insertGetId([...$row, 'review_level' => 1, 'action' => 'forward', 'assessment' => 'Complete.', 'remarks' => 'Good to go.']);
        $onlyAssessment = DB::table('reviews')->insertGetId([...$row, 'review_level' => 2, 'action' => 'endorse', 'assessment' => 'Complete.', 'remarks' => null]);
        $noAssessment = DB::table('reviews')->insertGetId([...$row, 'review_level' => 3, 'action' => 'return', 'assessment' => '  ', 'remarks' => 'Fix page 2.']);

        $migration->up();

        $this->assertFalse(Schema::hasColumn('reviews', 'assessment'));
        $this->assertFalse(Schema::hasColumn('reviews', 'rating'));
        $remarks = DB::table('reviews')->pluck('remarks', 'id');
        $this->assertSame("Complete.\n\nGood to go.", $remarks[$both]);
        $this->assertSame('Complete.', $remarks[$onlyAssessment]);
        $this->assertSame('Fix page 2.', $remarks[$noAssessment]);
    }
}
