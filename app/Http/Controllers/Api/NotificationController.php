<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransferLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $hospitalId = $user->hospital_id;

        $logs = TransferLog::with(['user', 'transferRequest.sendingHospital', 'transferRequest.receivingHospital'])
            ->whereHas('transferRequest', function ($q) use ($user, $hospitalId) {
                if (!in_array($user->role, ['coordinator', 'admin'])) {
                    $q->where('sending_hospital_id', $hospitalId)
                        ->orWhere('receiving_hospital_id', $hospitalId);
                }
            })
            ->latest()
            ->take(12)
            ->get();

        return response()->json([
            'notifications' => $logs,
        ]);
    }
}
