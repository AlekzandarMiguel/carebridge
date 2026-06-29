<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hospitals', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });

        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('coordinator_notes');
            $table->foreignId('archived_by')->nullable()->after('archived_at')->constrained('users')->nullOnDelete();
            $table->string('archive_reason')->nullable()->after('archived_by');
            $table->index(['archived_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropIndex(['archived_at', 'status']);
            $table->dropConstrainedForeignId('archived_by');
            $table->dropColumn(['archived_at', 'archive_reason']);
        });

        Schema::table('hospitals', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};
