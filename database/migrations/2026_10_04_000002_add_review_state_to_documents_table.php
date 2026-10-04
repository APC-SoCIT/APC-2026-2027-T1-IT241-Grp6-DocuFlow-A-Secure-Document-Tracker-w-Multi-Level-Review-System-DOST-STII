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
            // Story #27: "new" until the assigned reviewer opens it, then "ongoing".
            // Null when no reviewer holds it (returned or approved).
            $table->string('review_state')->nullable()->after('status');
        });

        // Documents waiting for a reviewer start as New.
        DB::table('documents')->whereNotNull('assigned_reviewer_id')->update(['review_state' => 'new']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('review_state');
        });
    }
};
