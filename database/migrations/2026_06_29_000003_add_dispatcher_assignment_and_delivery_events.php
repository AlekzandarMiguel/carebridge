<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->foreignId('assigned_dispatcher_id')->nullable()->after('accepted_by')->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable()->after('assigned_dispatcher_id');
            $table->decimal('route_distance_km', 8, 2)->nullable()->after('estimated_arrival_at');
            $table->unsignedInteger('estimated_travel_minutes')->nullable()->after('route_distance_km');
            $table->json('delivery_events')->nullable()->after('delivery_notes');

            $table->index(['assigned_dispatcher_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropIndex(['assigned_dispatcher_id', 'status']);
            $table->dropConstrainedForeignId('assigned_dispatcher_id');
            $table->dropColumn([
                'assigned_at',
                'route_distance_km',
                'estimated_travel_minutes',
                'delivery_events',
            ]);
        });
    }
};
