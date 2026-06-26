<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->string('delivery_status')->default('not_started')->after('status');
            $table->timestamp('delivery_started_at')->nullable()->after('delivery_status');
            $table->timestamp('patient_arrived_at')->nullable()->after('delivery_started_at');
            $table->timestamp('delivery_completed_at')->nullable()->after('patient_arrived_at');
            $table->string('delivery_last_location', 120)->nullable()->after('delivery_completed_at');
            $table->text('delivery_notes')->nullable()->after('delivery_last_location');
        });
    }

    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropColumn([
                'delivery_status',
                'delivery_started_at',
                'patient_arrived_at',
                'delivery_completed_at',
                'delivery_last_location',
                'delivery_notes',
            ]);
        });
    }
};
