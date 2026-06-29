<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_status', 40)->default('approved')->after('hospital_id');
            $table->timestamp('approved_at')->nullable()->after('account_status');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
        });

        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->json('document_checklist')->nullable()->after('documents_ready');
            $table->boolean('privacy_confirmed')->default(false)->after('document_checklist');
        });
    }

    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropColumn(['document_checklist', 'privacy_confirmed']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn(['account_status', 'approved_at']);
        });
    }
};
