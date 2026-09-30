<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // AI features were cut from the prototype entirely.
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('ai_feedback_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->text('ai_feedback_text')->nullable();
        });
    }
};
