<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransferAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'transfer_request_id',
        'uploaded_by',
        'document_type',
        'original_name',
        'path',
        'mime_type',
        'size_bytes',
    ];

    protected $appends = [
        'download_url',
    ];

    public function transferRequest()
    {
        return $this->belongsTo(TransferRequest::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getDownloadUrlAttribute(): string
    {
        return "/api/transfer-requests/{$this->transfer_request_id}/attachments/{$this->id}/download";
    }
}
