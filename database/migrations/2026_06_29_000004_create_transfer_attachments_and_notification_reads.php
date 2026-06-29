<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfer_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transfer_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('document_type', 80)->default('supporting_document');
            $table->string('original_name');
            $table->string('path');
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->timestamps();

            $table->index(['transfer_request_id', 'document_type']);
        });

        Schema::create('notification_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transfer_log_id')->constrained('transfer_logs')->cascadeOnDelete();
            $table->timestamp('read_at')->useCurrent();

            $table->unique(['user_id', 'transfer_log_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_reads');
        Schema::dropIfExists('transfer_attachments');
    }
};
