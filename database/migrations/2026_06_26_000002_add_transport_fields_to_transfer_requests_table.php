<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->string('transport_team', 120)->nullable()->after('delivery_notes');
            $table->string('ambulance_unit', 80)->nullable()->after('transport_team');
            $table->string('transport_contact', 80)->nullable()->after('ambulance_unit');
            $table->timestamp('estimated_arrival_at')->nullable()->after('transport_contact');
            $table->string('decline_reason_category', 80)->nullable()->after('estimated_arrival_at');
        });
    }

    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropColumn([
                'transport_team',
                'ambulance_unit',
                'transport_contact',
                'estimated_arrival_at',
                'decline_reason_category',
            ]);
        });
    }
};
