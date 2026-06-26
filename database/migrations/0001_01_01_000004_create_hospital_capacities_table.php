<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hospital_capacities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->integer('general_beds_available')->default(0);
            $table->integer('emergency_beds_available')->default(0);
            $table->integer('icu_beds_available')->default(0);
            $table->integer('ambulance_available')->default(0);
            $table->timestamp('last_updated')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospital_capacities');
    }
};
