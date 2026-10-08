<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The reviewer rating was removed, and reviewers now enter one field:
     * their official remarks. Before the assessment column goes, any
     * assessment already written is moved to the start of that review's
     * remarks, so nothing a reviewer wrote is lost.
     */
    public function up(): void
    {
        if (Schema::hasColumn('reviews', 'assessment')) {
            DB::table('reviews')
                ->whereNotNull('assessment')
                ->orderBy('id')
                ->chunkById(100, function ($reviews) {
                    foreach ($reviews as $review) {
                        $assessment = trim($review->assessment);
                        if ($assessment === '') {
                            continue;
                        }

                        $remarks = trim((string) $review->remarks);
                        DB::table('reviews')->where('id', $review->id)->update([
                            'remarks' => $remarks === '' ? $assessment : $assessment."\n\n".$remarks,
                        ]);
                    }
                });

            Schema::table('reviews', function (Blueprint $table) {
                $table->dropColumn('assessment');
            });
        }

        if (Schema::hasColumn('reviews', 'rating')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->dropColumn('rating');
            });
        }
    }

    /**
     * Puts both columns back, empty: moved assessments stay in the remarks,
     * and ratings aren't recalculated.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('reviews', 'assessment')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->text('assessment')->nullable()->after('review_level');
            });
        }

        if (! Schema::hasColumn('reviews', 'rating')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->unsignedTinyInteger('rating')->nullable()->after('tat_days');
            });
        }
    }
};
