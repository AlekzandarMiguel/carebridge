<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;
use App\Models\HospitalCapacity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HospitalCapacityController extends Controller
{
    public function index(int $hospitalId): JsonResponse
    {
        $capacity = HospitalCapacity::where('hospital_id', $hospitalId)
            ->latest()
            ->first();

        return response()->json([
            'capacity' => $capacity,
        ]);
    }

    public function update(Request $request, int $hospitalId): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'receiving_staff') {
            return response()->json(['message' => 'Only Acceptance Staff can update hospital capacity.'], 403);
        }

        if ((int) $user->hospital_id !== $hospitalId) {
            return response()->json(['message' => 'You can only update capacity for your own hospital.'], 403);
        }

        if (!Hospital::whereKey($hospitalId)->where('status', 'active')->exists()) {
            return response()->json(['message' => 'Hospital is not active or does not exist.'], 404);
        }

        $validated = $request->validate([
            'general_beds_available' => 'required|integer|min:0',
            'emergency_beds_available' => 'required|integer|min:0',
            'icu_beds_available' => 'required|integer|min:0',
            'ambulance_available' => 'required|integer|min:0',
        ]);

        $capacity = HospitalCapacity::where('hospital_id', $hospitalId)
            ->latest()
            ->first();

        if ($capacity) {
            $capacity->update([
                ...$validated,
                'last_updated' => now(),
            ]);
        } else {
            $capacity = HospitalCapacity::create([
                'hospital_id' => $hospitalId,
                ...$validated,
                'last_updated' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Capacity updated successfully.',
            'capacity' => $capacity,
        ]);
    }
}
