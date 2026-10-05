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
        Schema::table('documents', function (Blueprint $table) {
            // Required on new submissions; null only on documents submitted
            // before the field existed.
            $table->string('document_name', 150)->nullable()->after('reference_number');
            $table->text('description')->nullable()->after('document_name');
            // What "Other" means for this document, typed by the submitter.
            $table->string('document_type_other', 100)->nullable()->after('document_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['document_name', 'description', 'document_type_other']);
        });
    }
};
