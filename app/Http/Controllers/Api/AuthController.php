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
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function options(): JsonResponse
    {
        return response()->json([
            'hospitals' => Hospital::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'roles' => [
                ['value' => 'sending_staff', 'label' => 'Sending Staff'],
                ['value' => 'receiving_staff', 'label' => 'Receiving Staff'],
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

        $user = User::create($validated)->load('hospital');
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Account created successfully.',
            'user' => $user,
            'token' => $token,
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

        return response()->json([
            'message' => 'Reset token generated. Use it on the reset password screen.',
            'reset_token' => $token,
        ]);
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
                'label' => 'Sending Staff',
                'home' => '/create-transfer',
                'permissions' => [
                    'Create transfer requests',
                    'Use suggested receiving hospitals by case type',
                    'Track transfers involving your hospital',
                    'Start reserved transfers from your hospital',
                    'Monitor patient delivery from departure',
                    'Cancel outbound transfers from your hospital',
                ],
            ],
            'receiving_staff' => [
                'label' => 'Receiving Staff',
                'home' => '/incoming-requests',
                'permissions' => [
                    'Review incoming transfer requests',
                    'Use triage filters for urgency and waiting time',
                    'Accept or decline requests sent to your hospital',
                    'Reserve matching bed capacity',
                    'Update capacity for your own hospital',
                    'Mark patient arrival at your hospital',
                    'Complete incoming transfers',
                ],
            ],
            'coordinator' => [
                'label' => 'Coordinator',
                'home' => '/coordinator-board',
                'permissions' => [
                    'View all transfer activity',
                    'Monitor operational status without changing hospital actions',
                    'Escalate delayed or high-risk active transfers',
                    'Monitor patient delivery across hospitals',
                    'Review analytics across hospitals',
                    'Flag delays and coordinate follow-ups outside hospital action buttons',
                ],
            ],
            'admin' => [
                'label' => 'Admin',
                'home' => '/admin',
                'permissions' => [
                    'Manage users, hospitals, and role assignments',
                    'View command board and audit logs',
                    'Review system-wide transfer visibility',
                    'Review patient delivery visibility',
                    'Review all analytics',
                    'Maintain operational configuration without hospital action buttons',
                ],
            ],
        ];

        return $settings[$role] ?? [
            'label' => Str::headline($role),
            'home' => '/dashboard',
            'permissions' => ['Access assigned hospital workflows'],
        ];
    }
}
