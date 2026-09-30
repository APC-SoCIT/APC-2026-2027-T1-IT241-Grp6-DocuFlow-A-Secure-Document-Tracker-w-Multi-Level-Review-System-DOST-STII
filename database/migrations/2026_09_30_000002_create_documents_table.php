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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number')->unique();
            $table->string('document_type');
            $table->string('google_workspace_link')->nullable();
            $table->string('file_path')->nullable();
            $table->string('status')->default('pending_l1_review');
            $table->unsignedTinyInteger('current_review_level')->default(1);
            $table->foreignId('submitted_by')->constrained('users');
            $table->foreignId('assigned_reviewer_id')->nullable()->constrained('users');
            // When the current reviewer was assigned; the start point for TAT.
            $table->timestamp('assigned_at')->nullable();
            $table->text('ai_feedback_text')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
