<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfer_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sending_hospital_id')->constrained('hospitals')->cascadeOnDelete();
            $table->foreignId('receiving_hospital_id')->nullable()->constrained('hospitals')->nullOnDelete();
            $table->string('patient_reference_code');
            $table->string('case_type'); // general, emergency, icu
            $table->string('urgency_level')->default('normal'); // normal, urgent, critical
            $table->text('notes')->nullable();
            $table->string('status')->default('pending'); // pending, accepted, declined, reserved, in_transfer, completed, cancelled
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('accepted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfer_requests');
    }
};
