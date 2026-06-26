<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HospitalCapacity extends Model
{
    use HasFactory;

    protected $fillable = [
        'hospital_id',
        'general_beds_available',
        'emergency_beds_available',
        'icu_beds_available',
        'ambulance_available',
        'last_updated',
    ];

    protected function casts(): array
    {
        return [
            'last_updated' => 'datetime',
        ];
    }

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }
}
