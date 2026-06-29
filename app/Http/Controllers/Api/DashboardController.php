<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private const MONITOR_ROLES = ['coordinator', 'dispatcher', 'admin'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $hospitalId = $user->hospital_id;
        $baseQuery = $this->dashboardScope(TransferRequest::query(), $user->role, $hospitalId);

        $totalRequests = (clone $baseQuery)->count();
        $pendingRequests = (clone $baseQuery)->where('status', 'pending')->count();
        $acceptedRequests = (clone $baseQuery)->where('status', 'accepted')->count();
        $inTransfer = (clone $baseQuery)->where('status', 'in_transfer')->count();
        $completedRequests = (clone $baseQuery)->where('status', 'completed')->count();
        $declinedRequests = (clone $baseQuery)->where('status', 'declined')->count();
        $enRoutePatients = (clone $baseQuery)->where('delivery_status', 'en_route')->count();
        $arrivedPatients = (clone $baseQuery)->where('delivery_status', 'arrived')->count();
        $deliveredPatients = (clone $baseQuery)->where('delivery_status', 'delivered')->count();
        $waitingPatients = (clone $baseQuery)->whereIn('status', ['pending', 'accepted', 'reserved'])->count();
        $delayedCases = (clone $baseQuery)
            ->whereIn('status', ['pending', 'accepted'])
            ->where('created_at', '<=', now()->subMinutes(20))
            ->count();
        $assignedCases = (clone $baseQuery)->whereNotNull('assigned_dispatcher_id')->count();
        $unassignedCases = (clone $baseQuery)
            ->whereIn('status', ['pending', 'accepted', 'reserved', 'in_transfer'])
            ->whereNull('assigned_dispatcher_id')
            ->count();
        $avgTravelMinutes = (clone $baseQuery)->whereNotNull('estimated_travel_minutes')->avg('estimated_travel_minutes') ?? 0;

        $recentQuery = TransferRequest::with(['sendingHospital', 'receivingHospital', 'creator', 'assignedDispatcher']);
        $recentRequests = $this->dashboardScope($recentQuery, $user->role, $hospitalId)
            ->latest()
            ->take(5)
            ->get();

        $successRate = $totalRequests > 0
            ? round((($completedRequests) / $totalRequests) * 100, 1)
            : 0;

        return response()->json([
            'stats' => [
                'total_requests' => $totalRequests,
                'pending_requests' => $pendingRequests,
                'accepted_requests' => $acceptedRequests,
                'in_transfer' => $inTransfer,
                'completed_requests' => $completedRequests,
                'declined_requests' => $declinedRequests,
                'en_route_patients' => $enRoutePatients,
                'arrived_patients' => $arrivedPatients,
                'delivered_patients' => $deliveredPatients,
                'waiting_patients' => $waitingPatients,
                'delayed_cases' => $delayedCases,
                'assigned_cases' => $assignedCases,
                'unassigned_cases' => $unassignedCases,
                'avg_travel_minutes' => round($avgTravelMinutes),
                'success_rate' => $successRate,
            ],
            'recent_requests' => $recentRequests,
        ]);
    }

    private function dashboardScope($query, string $role, ?int $hospitalId)
    {
        return match ($role) {
            'sending_staff' => $query->where('sending_hospital_id', $hospitalId),
            'receiving_staff' => $query->where('receiving_hospital_id', $hospitalId),
            default => $query,
        };
    }
}
