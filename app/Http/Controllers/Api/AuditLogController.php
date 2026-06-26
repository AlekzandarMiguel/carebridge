<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransferLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can view audit logs.'], 403);
        }

        $validated = $request->validate([
            'action' => 'nullable|string|max:80',
            'role' => 'nullable|string|max:80',
            'q' => 'nullable|string|max:120',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $logs = TransferLog::with([
            'user.hospital',
            'transferRequest.sendingHospital',
            'transferRequest.receivingHospital',
        ])
            ->when($validated['action'] ?? null, fn ($q, $action) => $q->where('action', $action))
            ->when($validated['role'] ?? null, fn ($q, $role) => $q->whereHas('user', fn ($userQuery) => $userQuery->where('role', $role)))
            ->when($validated['from'] ?? null, fn ($q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($validated['to'] ?? null, fn ($q, $to) => $q->whereDate('created_at', '<=', $to))
            ->when($validated['q'] ?? null, function ($q, $search) {
                $q->where(function ($scoped) use ($search) {
                    $scoped->where('remarks', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('transferRequest', fn ($transferQuery) => $transferQuery->where('patient_reference_code', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate(20)
            ->appends($request->query());

        return response()->json([
            'audit_logs' => $logs,
        ]);
    }
}
