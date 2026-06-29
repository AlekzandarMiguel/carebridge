<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index(['role', 'account_status']);
        });

        Schema::table('hospitals', function (Blueprint $table) {
            $table->index('status');
        });

        Schema::table('hospital_capacities', function (Blueprint $table) {
            $table->index(['hospital_id', 'last_updated']);
        });

        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->index(['status', 'urgency_level']);
            $table->index(['sending_hospital_id', 'status']);
            $table->index(['receiving_hospital_id', 'status']);
            $table->index('reserved_until');
            $table->index('patient_reference_code');
        });

        Schema::table('transfer_logs', function (Blueprint $table) {
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('transfer_logs', function (Blueprint $table) {
            $table->dropIndex(['action', 'created_at']);
        });

        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropIndex(['status', 'urgency_level']);
            $table->dropIndex(['sending_hospital_id', 'status']);
            $table->dropIndex(['receiving_hospital_id', 'status']);
            $table->dropIndex(['reserved_until']);
            $table->dropIndex(['patient_reference_code']);
        });

        Schema::table('hospital_capacities', function (Blueprint $table) {
            $table->dropIndex(['hospital_id', 'last_updated']);
        });

        Schema::table('hospitals', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role', 'account_status']);
        });
    }
};
