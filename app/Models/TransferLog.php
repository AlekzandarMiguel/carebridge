<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransferLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'transfer_request_id',
        'user_id',
        'action',
        'remarks',
    ];

    public function transferRequest()
    {
        return $this->belongsTo(TransferRequest::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
