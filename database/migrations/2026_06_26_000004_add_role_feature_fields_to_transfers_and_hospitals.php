<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->string('rejection_reason', 120)->nullable()->after('notes');
            $table->string('placement_need', 120)->nullable()->after('rejection_reason');
            $table->boolean('documents_ready')->default(false)->after('placement_need');
            $table->text('accept_conditions')->nullable()->after('accepted_by');
            $table->timestamp('reserved_until')->nullable()->after('accept_conditions');
            $table->text('handoff_notes')->nullable()->after('reserved_until');
            $table->text('coordinator_notes')->nullable()->after('handoff_notes');
        });

        Schema::table('hospitals', function (Blueprint $table) {
            $table->string('transfer_contact_name')->nullable()->after('contact_number');
            $table->string('transfer_contact_phone', 80)->nullable()->after('transfer_contact_name');
            $table->string('emergency_contact_name')->nullable()->after('transfer_contact_phone');
            $table->string('emergency_contact_phone', 80)->nullable()->after('emergency_contact_name');
        });
    }

    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropColumn([
                'rejection_reason',
                'placement_need',
                'documents_ready',
                'accept_conditions',
                'reserved_until',
                'handoff_notes',
                'coordinator_notes',
            ]);
        });

        Schema::table('hospitals', function (Blueprint $table) {
            $table->dropColumn([
                'transfer_contact_name',
                'transfer_contact_phone',
                'emergency_contact_name',
                'emergency_contact_phone',
            ]);
        });
    }
};
