<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationRead;
use App\Models\TransferLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $hospitalId = $user->hospital_id;

        $logs = TransferLog::with(['user', 'transferRequest.sendingHospital', 'transferRequest.receivingHospital'])
            ->whereHas('transferRequest', fn ($q) => $this->scopeVisibleTransfers($q, $user, $hospitalId))
            ->latest()
            ->take(12)
            ->get();

        $readIds = NotificationRead::where('user_id', $user->id)
            ->whereIn('transfer_log_id', $logs->pluck('id'))
            ->pluck('transfer_log_id')
            ->all();
        $readLookup = array_flip($readIds);
        $notifications = $logs->map(function (TransferLog $log) use ($readLookup) {
            $log->setAttribute('is_read', isset($readLookup[$log->id]));
            $log->setAttribute('priority', $this->priorityFor($log));
            $log->setAttribute('priority_label', ucfirst($log->priority));
            $log->setAttribute('notification_type', $this->typeFor($log));

            return $log;
        })->filter(fn (TransferLog $log) => $this->enabledForUser($user, $log->notification_type))->values();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $notifications->where('is_read', false)->count(),
        ]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $hospitalId = $user->hospital_id;

        $log = TransferLog::whereKey($id)
            ->whereHas('transferRequest', fn ($q) => $this->scopeVisibleTransfers($q, $user, $hospitalId))
            ->firstOrFail();

        NotificationRead::updateOrCreate(
            ['user_id' => $user->id, 'transfer_log_id' => $log->id],
            ['read_at' => now()],
        );

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $hospitalId = $user->hospital_id;
        $logIds = TransferLog::whereHas('transferRequest', fn ($q) => $this->scopeVisibleTransfers($q, $user, $hospitalId))
            ->latest()
            ->take(50)
            ->pluck('id');

        DB::transaction(function () use ($user, $logIds) {
            foreach ($logIds as $logId) {
                NotificationRead::updateOrCreate(
                    ['user_id' => $user->id, 'transfer_log_id' => $logId],
                    ['read_at' => now()],
                );
            }
        });

        return response()->json(['message' => 'Notifications marked as read.']);
    }

    private function scopeVisibleTransfers($query, $user, $hospitalId): void
    {
        if (!in_array($user->role, ['coordinator', 'dispatcher', 'admin'])) {
            $query->where('sending_hospital_id', $hospitalId)
                ->orWhere('receiving_hospital_id', $hospitalId);
        }
    }

    private function priorityFor(TransferLog $log): string
    {
        $transfer = $log->transferRequest;

        if (in_array($log->action, ['escalated', 'delayed']) || $transfer?->sla_state === 'breached' || $transfer?->delivery_eta_state === 'late') {
            return 'critical';
        }

        if ($transfer?->urgency_level === 'critical' || $transfer?->sla_state === 'warning') {
            return 'high';
        }

        if (in_array($log->action, ['completed', 'handoff_completed'])) {
            return 'success';
        }

        return 'normal';
    }

    private function typeFor(TransferLog $log): string
    {
        return match (true) {
            in_array($log->action, ['escalated', 'reservation_expired']) || $log->transferRequest?->sla_state === 'breached' => 'sla_breach',
            $log->action === 'assigned' => 'assigned_case',
            in_array($log->action, ['patient_arrived', 'arrived_gate']) => 'arrival',
            in_array($log->action, ['completed', 'handoff_completed']) => 'completed_delivery',
            $log->action === 'declined' => 'declined_case',
            in_array($log->action, ['delayed', 'delivery_update']) && $log->transferRequest?->delivery_eta_state === 'late' => 'delivery_delay',
            default => 'case_activity',
        };
    }

    private function enabledForUser($user, string $type): bool
    {
        $defaults = [
            'sla_breach' => true,
            'assigned_case' => true,
            'arrival' => true,
            'completed_delivery' => true,
            'declined_case' => true,
            'delivery_delay' => true,
            'case_activity' => true,
        ];

        $preferences = array_merge($defaults, $user->notification_preferences ?? []);

        return (bool) ($preferences[$type] ?? true);
    }
}
