<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const PUBLIC_REGISTRATION_ROLES = ['sending_staff', 'receiving_staff'];

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = User::with('hospital')->where('email', $request->email)->first();

        if ($user->account_status !== 'approved') {
            Auth::logout();

            throw ValidationException::withMessages([
                'email' => [$user->account_status === 'suspended'
                    ? 'Your account has been suspended. Contact an admin for access.'
                    : 'Your account is waiting for admin approval.'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'role_settings' => $this->roleSettings($user->role),
        ]);
    }

    public function options(): JsonResponse
    {
        return response()->json([
            'hospitals' => Hospital::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'roles' => [
                ['value' => 'sending_staff', 'label' => 'Intake Staff'],
                ['value' => 'receiving_staff', 'label' => 'Acceptance Staff'],
            ],
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:'.implode(',', self::PUBLIC_REGISTRATION_ROLES),
            'hospital_id' => 'required|exists:hospitals,id',
        ]);

        if (!Hospital::whereKey($validated['hospital_id'])->where('status', 'active')->exists()) {
            return response()->json(['message' => 'Selected hospital is not active.'], 422);
        }

        $user = User::create([
            ...$validated,
            'account_status' => 'pending',
        ])->load('hospital');

        return response()->json([
            'message' => 'Account request submitted. An admin must approve it before sign in.',
            'user' => $user,
        ], 201);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            return response()->json([
                'message' => 'If an account exists, reset instructions will be available shortly.',
            ]);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ],
        );

        $resetUrl = url('/reset-password?email='.urlencode($user->email).'&token='.$token);

        Mail::raw(
            "Use this CareBridge reset link to update your password:\n\n{$resetUrl}\n\nIf you did not request this, ignore this message.",
            fn ($message) => $message->to($user->email)->subject('CareBridge password reset')
        );

        return response()->json(array_filter([
            'message' => app()->isProduction()
                ? 'If an account exists, reset instructions have been sent.'
                : 'Reset token generated. Use it on the reset password screen.',
            'reset_token' => app()->isProduction() ? null : $token,
            'reset_url' => app()->isProduction() ? null : $resetUrl,
        ]));
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (!$record || !Hash::check($validated['token'], $record->token)) {
            throw ValidationException::withMessages([
                'token' => ['The reset token is invalid.'],
            ]);
        }

        if (Carbon::parse($record->created_at)->lt(now()->subMinutes(60))) {
            throw ValidationException::withMessages([
                'token' => ['The reset token has expired.'],
            ]);
        }

        $user = User::where('email', $validated['email'])->firstOrFail();
        $user->forceFill([
            'password' => $validated['password'],
            'remember_token' => Str::random(60),
        ])->save();

        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
        $user->tokens()->delete();

        event(new PasswordReset($user));

        return response()->json([
            'message' => 'Password reset successfully. Please sign in with your new password.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('hospital');

        return response()->json([
            'user' => $user,
        ]);
    }

    public function settings(Request $request): JsonResponse
    {
        $user = $request->user()->load('hospital');

        return response()->json([
            'user' => $user,
            'role_settings' => $this->roleSettings($user->role),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$user->id,
            'current_password' => 'nullable|required_with:password|string',
            'password' => 'nullable|string|min:8|confirmed',
            'notification_preferences' => 'nullable|array',
            'notification_preferences.sla_breach' => 'boolean',
            'notification_preferences.assigned_case' => 'boolean',
            'notification_preferences.arrival' => 'boolean',
            'notification_preferences.completed_delivery' => 'boolean',
            'notification_preferences.declined_case' => 'boolean',
            'notification_preferences.delivery_delay' => 'boolean',
        ]);

        if (!empty($validated['password']) && !Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        if (!empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        if (array_key_exists('notification_preferences', $validated)) {
            $user->notification_preferences = array_merge(
                $this->defaultNotificationPreferences(),
                $validated['notification_preferences'] ?? [],
            );
        }

        $user->save();

        return response()->json([
            'message' => 'Settings updated successfully.',
            'user' => $user->load('hospital'),
            'role_settings' => $this->roleSettings($user->role),
        ]);
    }

    private function roleSettings(string $role): array
    {
        $settings = [
            'sending_staff' => [
                'label' => 'Intake Staff',
                'home' => '/intake',
                'responsibility' => 'Receives rejected patient cases and creates the placement case with rejection reason, urgency, required service, documents, and suggested destination.',
                'pages' => ['Rejected Intake', 'Case Tracking', 'Placement Directory', 'Analytics', 'Settings'],
                'permissions' => [
                    'Submit rejected patient cases',
                    'Use suggested accepting hospitals by case type',
                    'Track placement cases involving your hospital',
                    'Start patient delivery after reservation',
                    'Monitor patient delivery from departure',
                    'Cancel outbound cases from your hospital',
                ],
                'boundaries' => [
                    'Cannot accept or reserve capacity for another hospital',
                    'Cannot update hospital capacity',
                    'Cannot manage users or system settings',
                ],
            ],
            'receiving_staff' => [
                'label' => 'Acceptance Staff',
                'home' => '/incoming-requests',
                'responsibility' => 'Reviews cases sent to their hospital, accepts or declines, reserves capacity, updates own capacity, marks arrival, and completes handoff.',
                'pages' => ['Capacity Desk', 'Acceptance Queue', 'Case Tracking', 'Analytics', 'Settings'],
                'permissions' => [
                    'Review rejected patient acceptance requests',
                    'Use triage filters for urgency and waiting time',
                    'Accept or decline requests sent to your hospital',
                    'Reserve matching bed capacity',
                    'Update capacity for your own hospital',
                    'Mark patient arrival at your hospital',
                    'Complete incoming handoffs',
                ],
                'boundaries' => [
                    'Cannot create rejected patient cases',
                    'Cannot edit other hospitals capacity',
                    'Cannot assign dispatchers',
                ],
            ],
            'coordinator' => [
                'label' => 'Coordinator',
                'home' => '/coordinator-board',
                'responsibility' => 'Watches all active cases, resolves delays, escalates SLA breaches, reassigns dispatchers, and oversees stuck cases without acting as hospital staff.',
                'pages' => ['Command View', 'Wallboard', 'Placement Directory', 'Analytics', 'Audit Logs', 'Settings'],
                'permissions' => [
                    'View all rejected patient placement activity',
                    'Monitor operational status without changing hospital actions',
                    'Escalate delayed or high-risk active cases',
                    'Monitor patient delivery across hospitals',
                    'Review analytics across hospitals',
                    'Flag delays and coordinate follow-ups outside hospital action buttons',
                ],
                'boundaries' => [
                    'Does not accept or decline for hospitals',
                    'Does not directly reserve capacity',
                    'Can update delivery monitoring only with an audit reason',
                ],
            ],
            'dispatcher' => [
                'label' => 'Dispatcher',
                'home' => '/dispatcher-board',
                'responsibility' => 'Owns delivery movement after acceptance: ambulance assignment, ETA, route updates, location updates, delays, and arrival progress.',
                'pages' => ['Dispatcher Board', 'Wallboard', 'Placement Directory', 'Analytics', 'Settings'],
                'permissions' => [
                    'View dispatcher board and wallboard',
                    'Assign active rejected patient cases',
                    'Maintain ambulance, driver/contact, pickup, ETA, and route details',
                    'Update route distance and travel estimates',
                    'Add delivery timeline events',
                    'Monitor delayed placement and delivery cases',
                    'Review analytics for department handoffs',
                ],
                'boundaries' => [
                    'Cannot accept, decline, or reserve capacity',
                    'Cannot update hospital capacity',
                    'Cannot manage users or system settings',
                ],
            ],
            'admin' => [
                'label' => 'Admin',
                'home' => '/admin',
                'responsibility' => 'Manages users, hospitals, roles, settings, audit logs, demo configuration, and overall system governance.',
                'pages' => ['Admin', 'Command View', 'Wallboard', 'Placement Directory', 'Analytics', 'Audit Logs', 'Settings'],
                'permissions' => [
                    'Manage users, hospitals, and role assignments',
                    'View command board and audit logs',
                    'Review and explain the role matrix',
                    'Review system-wide rejected patient case visibility',
                    'Review patient delivery visibility',
                    'Review all analytics',
                    'Maintain operational configuration without hospital action buttons',
                ],
                'boundaries' => [
                    'Should not perform routine hospital acceptance work',
                    'Can override only when documented',
                    'Does not replace department workflow ownership',
                ],
            ],
        ];

        return $settings[$role] ?? [
            'label' => Str::headline($role),
            'home' => '/dashboard',
            'permissions' => ['Access assigned hospital workflows'],
        ];
    }

    private function defaultNotificationPreferences(): array
    {
        return [
            'sla_breach' => true,
            'assigned_case' => true,
            'arrival' => true,
            'completed_delivery' => true,
            'declined_case' => true,
            'delivery_delay' => true,
            'case_activity' => true,
        ];
    }
}
