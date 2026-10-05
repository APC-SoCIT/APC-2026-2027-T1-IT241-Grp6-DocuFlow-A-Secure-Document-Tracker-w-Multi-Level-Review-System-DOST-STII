<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The uploaded file's original name, shown in the document details.
     * The stored file itself keeps its generated name.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('file_name')->nullable()->after('file_path');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('file_name');
        });
    }
};
