<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncomingRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'receiving_staff') {
            return response()->json(['message' => 'Only Acceptance Staff can view the acceptance queue.'], 403);
        }

        $hospitalId = $user->hospital_id;

        $incomingRequests = TransferRequest::with(['sendingHospital', 'creator'])
            ->where('receiving_hospital_id', $hospitalId)
            ->whereIn('status', ['pending', 'accepted', 'reserved'])
            ->latest()
            ->get();

        return response()->json([
            'incoming_requests' => $incomingRequests,
        ]);
    }
}
