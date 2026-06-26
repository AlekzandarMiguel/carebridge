<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;
use App\Models\SystemSetting;
use App\Models\User;
use Database\Seeders\HospitalSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can manage system records.'], 403);
        }

        return response()->json([
            'users' => User::with('hospital')->orderBy('role')->orderBy('name')->get(),
            'hospitals' => Hospital::with('latestCapacity')->orderBy('name')->get(),
        ]);
    }

    public function createUser(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can create users.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'role' => 'required|in:sending_staff,receiving_staff,coordinator,admin',
            'hospital_id' => 'nullable|exists:hospitals,id',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create($validated);

        return response()->json([
            'message' => 'User created.',
            'user' => $user->load('hospital'),
        ], 201);
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can update users.'], 403);
        }

        $user = User::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$user->id,
            'role' => 'required|in:sending_staff,receiving_staff,coordinator,admin',
            'hospital_id' => 'nullable|exists:hospitals,id',
            'password' => 'nullable|string|min:8',
        ]);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User updated.',
            'user' => $user->load('hospital'),
        ]);
    }

    public function createHospital(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can create hospitals.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'contact_number' => 'required|string|max:80',
            'transfer_contact_name' => 'nullable|string|max:255',
            'transfer_contact_phone' => 'nullable|string|max:80',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:80',
            'status' => 'required|in:active,inactive',
        ]);

        $hospital = Hospital::create($validated);

        return response()->json([
            'message' => 'Hospital created.',
            'hospital' => $hospital,
        ], 201);
    }

    public function updateHospital(Request $request, int $id): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can update hospitals.'], 403);
        }

        $hospital = Hospital::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'contact_number' => 'required|string|max:80',
            'transfer_contact_name' => 'nullable|string|max:255',
            'transfer_contact_phone' => 'nullable|string|max:80',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:80',
            'status' => 'required|in:active,inactive',
        ]);

        $hospital->update($validated);

        return response()->json([
            'message' => 'Hospital updated.',
            'hospital' => $hospital->load('latestCapacity'),
        ]);
    }

    public function systemSettings(Request $request): JsonResponse
    {
        if (!in_array($request->user()->role, ['coordinator', 'admin'])) {
            return response()->json(['message' => 'Only coordinators and admins can view system settings.'], 403);
        }

        return response()->json([
            'settings' => $this->settingsWithDefaults(),
        ]);
    }

    public function updateSystemSettings(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can update system settings.'], 403);
        }

        $validated = $request->validate([
            'reservation_minutes' => 'required|integer|min:5|max:240',
            'sla_pending_minutes' => 'required|integer|min:5|max:240',
            'case_types' => 'required|string|max:500',
            'decline_reasons' => 'required|string|max:1000',
            'bed_categories' => 'required|string|max:500',
        ]);

        foreach ($validated as $key => $value) {
            SystemSetting::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        }

        return response()->json([
            'message' => 'System settings updated.',
            'settings' => $this->settingsWithDefaults(),
        ]);
    }

    public function refreshDemoData(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can refresh demo data.'], 403);
        }

        app(HospitalSeeder::class)->run();
        app(UserSeeder::class)->run();

        return response()->json([
            'message' => 'Demo hospitals, users, and capacities refreshed.',
            'users' => User::with('hospital')->orderBy('role')->orderBy('name')->get(),
            'hospitals' => Hospital::with('latestCapacity')->orderBy('name')->get(),
        ]);
    }

    private function settingsWithDefaults(): array
    {
        $defaults = [
            'reservation_minutes' => '30',
            'sla_pending_minutes' => '20',
            'case_types' => 'general, emergency, icu',
            'decline_reasons' => 'No general bed, No ICU bed, No emergency bed, No ambulance, Staff unavailable, Case not supported, Other',
            'bed_categories' => 'General, Emergency, ICU, Ambulance',
        ];

        $stored = SystemSetting::pluck('value', 'key')->toArray();

        return array_merge($defaults, $stored);
    }
}
