<?php

namespace Tests\Feature;

use App\Models\Hospital;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_register_and_receive_role_settings(): void
    {
        $hospital = $this->createHospital();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Dr. New User',
            'email' => 'new.user@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'sending_staff',
            'hospital_id' => $hospital->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'new.user@example.com')
            ->assertJsonPath('user.role', 'sending_staff')
            ->assertJsonPath('user.account_status', 'pending')
            ->assertJsonMissingPath('token');

        $this->assertDatabaseHas('users', [
            'email' => 'new.user@example.com',
            'role' => 'sending_staff',
            'account_status' => 'pending',
        ]);
    }

    public function test_pending_registered_users_cannot_sign_in_until_approved(): void
    {
        $hospital = $this->createHospital();

        $this->postJson('/api/auth/register', [
            'name' => 'Pending User',
            'email' => 'pending.user@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'receiving_staff',
            'hospital_id' => $hospital->id,
        ])->assertCreated();

        $this->postJson('/api/auth/login', [
            'email' => 'pending.user@example.com',
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_suspended_users_cannot_sign_in(): void
    {
        $hospital = $this->createHospital();
        $user = $this->createUser($hospital);
        $user->update(['account_status' => 'suspended']);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath('errors.email.0', 'Your account has been suspended. Contact an admin for access.');
    }

    public function test_public_registration_cannot_create_privileged_roles(): void
    {
        $hospital = $this->createHospital();

        $this->postJson('/api/auth/register', [
            'name' => 'Admin Attempt',
            'email' => 'admin.attempt@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
            'hospital_id' => $hospital->id,
        ])->assertUnprocessable();
    }

    public function test_forgot_and_reset_password_flow_updates_password(): void
    {
        $hospital = $this->createHospital();
        $user = $this->createUser($hospital);
        Mail::fake();

        $forgotResponse = $this->postJson('/api/auth/forgot-password', [
            'email' => $user->email,
        ]);

        $forgotResponse->assertOk()
            ->assertJsonStructure(['message', 'reset_token']);

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $forgotResponse->json('reset_token'),
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])->assertOk();

        $user->refresh();

        $this->assertTrue(Hash::check('new-password123', $user->password));
    }

    public function test_authenticated_user_can_update_profile_settings(): void
    {
        $hospital = $this->createHospital();
        $user = $this->createUser($hospital);

        Sanctum::actingAs($user);

        $response = $this->putJson('/api/auth/settings', [
            'name' => 'Updated User',
            'email' => 'updated.user@example.com',
            'current_password' => 'password123',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.name', 'Updated User')
            ->assertJsonPath('role_settings.label', 'Intake Staff')
            ->assertJsonPath('role_settings.responsibility', 'Receives rejected patient cases and creates the placement case with rejection reason, urgency, required service, documents, and suggested destination.')
            ->assertJsonPath('role_settings.pages.0', 'Rejected Intake')
            ->assertJsonPath('role_settings.boundaries.0', 'Cannot accept or reserve capacity for another hospital');

        $user->refresh();

        $this->assertSame('updated.user@example.com', $user->email);
        $this->assertTrue(Hash::check('new-password123', $user->password));
    }

    private function createHospital(): Hospital
    {
        return Hospital::create([
            'name' => 'Bukidnon Provincial Medical Center',
            'address' => 'Malaybalay City, Bukidnon',
            'contact_number' => 'Contact hospital directly',
            'status' => 'active',
        ]);
    }

    private function createUser(Hospital $hospital): User
    {
        return User::create([
            'name' => 'Existing User',
            'email' => 'existing.user@example.com',
            'password' => 'password123',
            'role' => 'sending_staff',
            'hospital_id' => $hospital->id,
        ]);
    }
}
