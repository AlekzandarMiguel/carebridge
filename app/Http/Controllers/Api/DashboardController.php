<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $hospitalId = $user->hospital_id;
        $baseQuery = TransferRequest::query()
            ->when(!in_array($user->role, ['coordinator', 'admin']), function ($q) use ($hospitalId) {
                $q->where(function ($scoped) use ($hospitalId) {
                    $scoped->where('sending_hospital_id', $hospitalId)
                        ->orWhere('receiving_hospital_id', $hospitalId);
                });
            });

        $totalRequests = (clone $baseQuery)->count();
        $pendingRequests = (clone $baseQuery)->where('status', 'pending')->count();
        $acceptedRequests = (clone $baseQuery)->where('status', 'accepted')->count();
        $inTransfer = (clone $baseQuery)->where('status', 'in_transfer')->count();
        $completedRequests = (clone $baseQuery)->where('status', 'completed')->count();
        $declinedRequests = (clone $baseQuery)->where('status', 'declined')->count();
        $enRoutePatients = (clone $baseQuery)->where('delivery_status', 'en_route')->count();
        $arrivedPatients = (clone $baseQuery)->where('delivery_status', 'arrived')->count();
        $deliveredPatients = (clone $baseQuery)->where('delivery_status', 'delivered')->count();

        $recentRequests = TransferRequest::with(['sendingHospital', 'receivingHospital', 'creator'])
            ->when(!in_array($user->role, ['coordinator', 'admin']), function ($q) use ($hospitalId) {
                $q->where('sending_hospital_id', $hospitalId)
                  ->orWhere('receiving_hospital_id', $hospitalId);
            })
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
                'success_rate' => $successRate,
            ],
            'recent_requests' => $recentRequests,
        ]);
    }
}
