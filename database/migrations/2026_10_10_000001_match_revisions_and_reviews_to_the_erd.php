<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Follow the ERD (docs/ERD-DocuFlow-Script-v4.sql):
     * - The original submission lives only on the document row. A revision
     *   row is made only by a resubmission, numbered 1, 2, 3 per document,
     *   with its own file or link.
     * - A review targets the original (document_id) or one revision
     *   (revision_id), never both.
     * - No resubmission counter: the count is the number of revision rows.
     *
     * Each step checks whether it already ran, so a failed run can be retried.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('document_revisions', 'file_path')) {
            Schema::table('document_revisions', function (Blueprint $table) {
                $table->string('google_workspace_link')->nullable()->after('change_note');
                $table->string('file_path')->nullable()->after('google_workspace_link');
                // The uploaded file's original name, as on documents.
                $table->string('file_name')->nullable()->after('file_path');
            });
        }

        if (! Schema::hasColumn('reviews', 'revision_id')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->unsignedBigInteger('document_id')->nullable()->change();
                $table->foreignId('revision_id')->nullable()->after('document_id')
                    ->constrained('document_revisions')->cascadeOnDelete();
            });
        }

        // Existing documents are still in the old shape while the counter exists.
        if (Schema::hasColumn('documents', 'resubmission_count')) {
            DB::transaction(function () {
                foreach (DB::table('documents')->orderBy('id')->get() as $document) {
                    $this->convert($document);
                }
            });

            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn('resubmission_count');
            });
        }

        // One review per level for each submission (ERD uq_document_level, uq_revision_level).
        if (! Schema::hasIndex('reviews', ['document_id', 'review_level'], 'unique')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->unique(['document_id', 'review_level']);
                $table->unique(['revision_id', 'review_level']);
            });
        }
    }

    /**
     * Old shape: revision 1 was made at the first submission, every
     * resubmission replaced the file or link on the document row, and every
     * review pointed at the document.
     */
    private function convert(object $document): void
    {
        DB::table('document_revisions')
            ->where('document_id', $document->id)
            ->where('revision_number', 1)
            ->delete();

        // The resubmissions move down by one: old revision 2 is now revision 1.
        $revisions = DB::table('document_revisions')
            ->where('document_id', $document->id)
            ->orderBy('revision_number')
            ->get();
        foreach ($revisions as $index => $revision) {
            DB::table('document_revisions')->where('id', $revision->id)->update(['revision_number' => $index + 1]);
        }

        if ($revisions->isEmpty()) {
            return;
        }

        // Earlier uploads were replaced on resubmission and can't be
        // recovered. The current file or link belongs to the latest revision,
        // and stays on the document row as the closest thing to the original.
        DB::table('document_revisions')->where('id', $revisions->last()->id)->update([
            'google_workspace_link' => $document->google_workspace_link,
            'file_path' => $document->file_path,
            'file_name' => $document->file_name,
        ]);

        // A document is only resubmitted after a return, so the reviews after
        // the Nth return were made on revision N.
        $returns = 0;
        $reviews = DB::table('reviews')->where('document_id', $document->id)->orderBy('id')->get();
        foreach ($reviews as $review) {
            $target = min($returns, $revisions->count());
            if ($target > 0) {
                DB::table('reviews')->where('id', $review->id)->update([
                    'document_id' => null,
                    'revision_id' => $revisions[$target - 1]->id,
                ]);
            }

            if ($review->action === 'return') {
                $returns++;
            }
        }
    }

    /**
     * Back to the old shape: revision 1 is made again from the document row,
     * the latest file or link goes back on the document, and every review
     * points at the document again.
     */
    public function down(): void
    {
        // MySQL needs an index for the document_id foreign key once the unique one goes.
        $needsIndex = ! Schema::hasIndex('reviews', ['document_id']);

        Schema::table('reviews', function (Blueprint $table) use ($needsIndex) {
            $table->dropForeign(['revision_id']);
            if ($needsIndex) {
                $table->index('document_id');
            }
            $table->dropUnique(['document_id', 'review_level']);
            $table->dropUnique(['revision_id', 'review_level']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->unsignedInteger('resubmission_count')->default(0)->after('submitted_at');
        });

        DB::transaction(function () {
            foreach (DB::table('reviews')->whereNotNull('revision_id')->get(['id', 'revision_id']) as $review) {
                DB::table('reviews')->where('id', $review->id)->update([
                    'document_id' => DB::table('document_revisions')->where('id', $review->revision_id)->value('document_id'),
                ]);
            }

            foreach (DB::table('documents')->orderBy('id')->get() as $document) {
                $revisions = DB::table('document_revisions')
                    ->where('document_id', $document->id)
                    ->orderByDesc('revision_number')
                    ->get();
                foreach ($revisions as $revision) {
                    DB::table('document_revisions')->where('id', $revision->id)->update(['revision_number' => $revision->revision_number + 1]);
                }

                DB::table('document_revisions')->insert([
                    'document_id' => $document->id,
                    'revision_number' => 1,
                    'submitted_by' => $document->submitted_by,
                    'created_at' => $document->submitted_at ?? $document->created_at,
                    'updated_at' => $document->submitted_at ?? $document->created_at,
                ]);

                $latest = $revisions->first();
                DB::table('documents')->where('id', $document->id)->update([
                    'resubmission_count' => $revisions->count(),
                    ...($latest ? [
                        'google_workspace_link' => $latest->google_workspace_link,
                        'file_path' => $latest->file_path,
                        'file_name' => $latest->file_name,
                    ] : []),
                ]);
            }
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn('revision_id');
            $table->unsignedBigInteger('document_id')->nullable(false)->change();
        });

        Schema::table('document_revisions', function (Blueprint $table) {
            $table->dropColumn(['google_workspace_link', 'file_path', 'file_name']);
        });
    }
};
