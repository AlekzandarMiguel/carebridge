<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\Hospital;
use App\Models\SystemSetting;
use App\Models\User;
use Database\Seeders\HospitalSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can manage system records.'], 403);
        }

        return response()->json([
            'users' => User::with('hospital', 'approver')->orderBy('account_status')->orderBy('role')->orderBy('name')->get(),
            'hospitals' => Hospital::with('latestCapacity')->orderBy('name')->get(),
            'admin_activity' => AdminActivityLog::with(['admin', 'targetUser'])
                ->latest()
                ->take(20)
                ->get(),
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
            'role' => 'required|in:sending_staff,receiving_staff,coordinator,dispatcher,admin',
            'hospital_id' => 'nullable|exists:hospitals,id',
            'password' => 'required|string|min:8',
            'account_status' => 'nullable|in:pending,approved,suspended',
        ]);

        $status = $validated['account_status'] ?? 'approved';
        $user = User::create([
            ...$validated,
            'account_status' => $status,
            'approved_at' => $status === 'approved' ? now() : null,
            'approved_by' => $status === 'approved' ? $request->user()->id : null,
        ]);
        $this->logAdminActivity($request, $user, 'user_created', [
            'role' => $user->role,
            'account_status' => $user->account_status,
        ], 'User created by admin.');

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
        $before = $user->only(['name', 'email', 'role', 'hospital_id', 'account_status']);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$user->id,
            'role' => 'required|in:sending_staff,receiving_staff,coordinator,dispatcher,admin',
            'hospital_id' => 'nullable|exists:hospitals,id',
            'password' => 'nullable|string|min:8',
            'account_status' => 'required|in:pending,approved,suspended',
        ]);

        $passwordChanged = !empty($validated['password']);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        if ($validated['account_status'] === 'approved' && $user->account_status !== 'approved') {
            $validated['approved_at'] = now();
            $validated['approved_by'] = $request->user()->id;
        }

        if ($validated['account_status'] !== 'approved') {
            $validated['approved_at'] = null;
            $validated['approved_by'] = null;
            $user->tokens()->delete();
        }

        $user->update($validated);
        $user->refresh();
        $after = $user->only(['name', 'email', 'role', 'hospital_id', 'account_status']);
        $changes = collect($after)
            ->filter(fn ($value, $key) => ($before[$key] ?? null) !== $value)
            ->map(fn ($value, $key) => ['from' => $before[$key] ?? null, 'to' => $value])
            ->all();

        if ($passwordChanged) {
            $changes['password'] = ['from' => 'unchanged', 'to' => 'reset'];
            $user->tokens()->delete();
        }

        if (!empty($changes)) {
            $this->logAdminActivity($request, $user, 'user_updated', $changes, 'User account updated.');
        }

        return response()->json([
            'message' => 'User updated.',
            'user' => $user->load('hospital'),
        ]);
    }

    public function updateUserStatus(Request $request, int $id): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can update account status.'], 403);
        }

        $target = User::findOrFail($id);
        $validated = $request->validate([
            'account_status' => 'required|in:pending,approved,suspended',
            'remarks' => 'nullable|string|max:500',
        ]);
        $before = $target->account_status;

        $target->update([
            'account_status' => $validated['account_status'],
            'approved_at' => $validated['account_status'] === 'approved' ? now() : null,
            'approved_by' => $validated['account_status'] === 'approved' ? $request->user()->id : null,
        ]);

        if ($validated['account_status'] !== 'approved') {
            $target->tokens()->delete();
        }

        $this->logAdminActivity($request, $target, 'account_status_changed', [
            'account_status' => ['from' => $before, 'to' => $validated['account_status']],
        ], $validated['remarks'] ?? 'Account status changed.');

        return response()->json([
            'message' => 'Account status updated.',
            'user' => $target->load('hospital', 'approver'),
        ]);
    }

    public function resetUserPassword(Request $request, int $id): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can reset user passwords.'], 403);
        }

        $target = User::findOrFail($id);
        $validated = $request->validate([
            'password' => 'nullable|string|min:8',
        ]);
        $temporaryPassword = $validated['password'] ?? 'CareBridge-'.Str::upper(Str::random(6));

        $target->forceFill(['password' => $temporaryPassword])->save();
        $target->tokens()->delete();

        $this->logAdminActivity($request, $target, 'password_reset', [
            'password' => ['from' => 'hidden', 'to' => 'temporary reset'],
        ], 'Admin reset user password.');

        return response()->json([
            'message' => 'Password reset. Share the temporary password securely.',
            'temporary_password' => $temporaryPassword,
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
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
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
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
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
        if (!in_array($request->user()->role, ['coordinator', 'dispatcher', 'admin'])) {
            return response()->json(['message' => 'Only department monitors can view system settings.'], 403);
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
            'users' => User::with('hospital', 'approver')->orderBy('account_status')->orderBy('role')->orderBy('name')->get(),
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

    private function logAdminActivity(Request $request, User $target, string $action, array $changes = [], ?string $remarks = null): void
    {
        AdminActivityLog::create([
            'admin_user_id' => $request->user()?->id,
            'target_user_id' => $target->id,
            'action' => $action,
            'changes' => $changes,
            'remarks' => $remarks,
        ]);
    }
}
