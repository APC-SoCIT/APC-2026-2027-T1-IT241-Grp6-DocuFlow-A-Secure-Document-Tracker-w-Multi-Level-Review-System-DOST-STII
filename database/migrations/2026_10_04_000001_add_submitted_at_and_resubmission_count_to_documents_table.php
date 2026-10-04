<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // The Date Submitted: set on first submission, never changed on resubmission.
            $table->timestamp('submitted_at')->nullable()->after('file_path');
            // Goes up by 1 on every resubmission (backlog #18).
            $table->unsignedInteger('resubmission_count')->default(0)->after('submitted_at');
        });

        // Backfill existing documents from what's already recorded.
        foreach (DB::table('documents')->get(['id', 'created_at']) as $document) {
            $revisions = (int) DB::table('document_revisions')->where('document_id', $document->id)->max('revision_number');

            DB::table('documents')->where('id', $document->id)->update([
                'submitted_at' => $document->created_at,
                'resubmission_count' => max(0, $revisions - 1),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['submitted_at', 'resubmission_count']);
        });
    }
};
