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

        $logs = $this->filteredLogs($validated)
            ->latest()
            ->paginate(20)
            ->appends($request->query());

        return response()->json([
            'audit_logs' => $logs,
        ]);
    }

    public function export(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can export audit logs.'], 403);
        }

        $validated = $request->validate([
            'action' => 'nullable|string|max:80',
            'role' => 'nullable|string|max:80',
            'q' => 'nullable|string|max:120',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $logs = $this->filteredLogs($validated)->latest()->get();

        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Time', 'Action', 'Reference', 'User', 'Role', 'Route', 'Remarks']);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    optional($log->created_at)->toDateTimeString(),
                    $log->action,
                    $log->transferRequest?->patient_reference_code,
                    $log->user?->name ?? 'System',
                    $log->user?->role,
                    trim(($log->transferRequest?->sendingHospital?->name ?? '-').' to '.($log->transferRequest?->receivingHospital?->name ?? '-')),
                    $log->remarks,
                ]);
            }

            fclose($handle);
        }, 'carebridge-audit-logs.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function filteredLogs(array $filters)
    {
        return TransferLog::with([
            'user.hospital',
            'transferRequest.sendingHospital',
            'transferRequest.receivingHospital',
        ])
            ->when($filters['action'] ?? null, fn ($q, $action) => $q->where('action', $action))
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->whereHas('user', fn ($userQuery) => $userQuery->where('role', $role)))
            ->when($filters['from'] ?? null, fn ($q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn ($q, $to) => $q->whereDate('created_at', '<=', $to))
            ->when($filters['q'] ?? null, function ($q, $search) {
                $q->where(function ($scoped) use ($search) {
                    $scoped->where('remarks', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('transferRequest', fn ($transferQuery) => $transferQuery->where('patient_reference_code', 'like', "%{$search}%"));
                });
            });
    }
}
