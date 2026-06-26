<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, ['coordinator', 'admin'])) {
            return response()->json(['message' => 'Only coordinators and admins can view analytics.'], 403);
        }

        $baseQuery = TransferRequest::query();

        // Total counts by status
        $statusCounts = (clone $baseQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Fill missing statuses with 0
        $allStatuses = ['pending', 'accepted', 'declined', 'reserved', 'in_transfer', 'completed', 'cancelled'];
        $statusChart = [];
        foreach ($allStatuses as $status) {
            $statusChart[] = [
                'status' => $status,
                'count' => $statusCounts[$status] ?? 0,
            ];
        }

        // Transfers over time (last 7 days)
        $transfersOverTime = (clone $baseQuery)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('count(*) as count')
            )
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Urgency distribution
        $urgencyCounts = (clone $baseQuery)
            ->select('urgency_level', DB::raw('count(*) as count'))
            ->groupBy('urgency_level')
            ->pluck('count', 'urgency_level')
            ->toArray();

        $urgencyChart = [];
        foreach (['normal', 'urgent', 'critical'] as $level) {
            $urgencyChart[] = [
                'urgency_level' => $level,
                'count' => $urgencyCounts[$level] ?? 0,
            ];
        }

        // Case type distribution
        $caseTypeCounts = (clone $baseQuery)
            ->select('case_type', DB::raw('count(*) as count'))
            ->groupBy('case_type')
            ->pluck('count', 'case_type')
            ->toArray();

        $caseTypeChart = [];
        foreach (['general', 'emergency', 'icu'] as $type) {
            $caseTypeChart[] = [
                'case_type' => $type,
                'count' => $caseTypeCounts[$type] ?? 0,
            ];
        }

        // Average coordination time (from created to completed, in minutes)
        $completedTransfers = (clone $baseQuery)
            ->where('status', 'completed')
            ->get(['created_at', 'updated_at']);

        $avgCoordinationTime = $completedTransfers->isNotEmpty()
            ? $completedTransfers->avg(fn ($transfer) => $transfer->created_at->diffInMinutes($transfer->updated_at))
            : 0;

        // Hospital-level stats (top hospitals by transfers)
        $hospitalStats = (clone $baseQuery)
            ->with('sendingHospital')
            ->select('sending_hospital_id', DB::raw('count(*) as total'))
            ->groupBy('sending_hospital_id')
            ->orderByDesc('total')
            ->take(5)
            ->get()
            ->map(fn ($t) => [
                'hospital_name' => $t->sendingHospital?->name ?? 'Unknown hospital',
                'total' => $t->total,
            ]);

        $totalRequests = array_sum(array_values($statusCounts));
        $completedCount = $statusCounts['completed'] ?? 0;
        $successRate = $totalRequests > 0
            ? round(($completedCount / $totalRequests) * 100, 1)
            : 0;

        return response()->json([
            'status_distribution' => $statusChart,
            'transfers_over_time' => $transfersOverTime,
            'urgency_distribution' => $urgencyChart,
            'case_type_distribution' => $caseTypeChart,
            'hospital_stats' => $hospitalStats,
            'summary' => [
                'total_requests' => $totalRequests,
                'completed_requests' => $completedCount,
                'success_rate' => $successRate,
                'avg_coordination_time_minutes' => round($avgCoordinationTime),
            ],
        ]);
    }
}
