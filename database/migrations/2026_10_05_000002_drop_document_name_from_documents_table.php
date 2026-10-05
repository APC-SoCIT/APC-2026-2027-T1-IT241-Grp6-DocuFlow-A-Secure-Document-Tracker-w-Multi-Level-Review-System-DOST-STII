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
        // Document Name was dropped from the submission form; documents are
        // identified by their reference number again.
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('document_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('document_name', 150)->nullable()->after('reference_number');
        });
    }
};
