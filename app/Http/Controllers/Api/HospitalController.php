<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;
use Illuminate\Http\JsonResponse;

class HospitalController extends Controller
{
    public function index(): JsonResponse
    {
        $hospitals = Hospital::with('latestCapacity')
            ->where('status', 'active')
            ->get();

        return response()->json([
            'hospitals' => $hospitals,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $hospital = Hospital::with('latestCapacity', 'users')
            ->findOrFail($id);

        return response()->json([
            'hospital' => $hospital,
        ]);
    }
}
