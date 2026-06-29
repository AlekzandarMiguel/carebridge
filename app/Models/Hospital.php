<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hospital extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'latitude',
        'longitude',
        'contact_number',
        'transfer_contact_name',
        'transfer_contact_phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'status',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function capacities()
    {
        return $this->hasMany(HospitalCapacity::class);
    }

    public function latestCapacity()
    {
        return $this->hasOne(HospitalCapacity::class)->latestOfMany();
    }

    public function sentTransferRequests()
    {
        return $this->hasMany(TransferRequest::class, 'sending_hospital_id');
    }

    public function receivedTransferRequests()
    {
        return $this->hasMany(TransferRequest::class, 'receiving_hospital_id');
    }
}
