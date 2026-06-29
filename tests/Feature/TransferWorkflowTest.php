<?php

namespace Tests\Feature;

use App\Models\Hospital;
use App\Models\HospitalCapacity;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransferWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_request_lifecycle_respects_hospital_roles_and_capacity(): void
    {
        [$sendingHospital, $receivingHospital, $otherHospital] = $this->createHospitals();
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $receiver = $this->createUser($receivingHospital, 'receiving_staff');
        $outsider = $this->createUser($otherHospital, 'receiving_staff');

        Sanctum::actingAs($sender);

        $createResponse = $this->postJson('/api/transfer-requests', [
            'receiving_hospital_id' => $receivingHospital->id,
            'patient_reference_code' => 'PT-2026-0001',
            'case_type' => 'icu',
            'urgency_level' => 'critical',
            'notes' => 'Needs ICU bed.',
            'privacy_confirmed' => true,
        ]);

        $createResponse->assertCreated();
        $transferId = $createResponse->json('transfer_request.id');

        Sanctum::actingAs($outsider);
        $this->putJson("/api/transfer-requests/{$transferId}/accept")
            ->assertForbidden();

        Sanctum::actingAs($receiver);
        $this->putJson("/api/transfer-requests/{$transferId}/accept")
            ->assertOk()
            ->assertJsonPath('transfer_request.status', 'accepted');

        $this->putJson("/api/transfer-requests/{$transferId}/reserve")
            ->assertOk()
            ->assertJsonPath('transfer_request.status', 'reserved');

        $this->assertDatabaseHas('hospital_capacities', [
            'hospital_id' => $receivingHospital->id,
            'icu_beds_available' => 1,
        ]);

        Sanctum::actingAs($sender);
        $this->putJson("/api/transfer-requests/{$transferId}/transfer")
            ->assertOk()
            ->assertJsonPath('transfer_request.status', 'in_transfer')
            ->assertJsonPath('transfer_request.delivery_status', 'en_route');

        Sanctum::actingAs($receiver);
        $this->putJson("/api/transfer-requests/{$transferId}/arrive")
            ->assertOk()
            ->assertJsonPath('transfer_request.delivery_status', 'arrived');

        $this->putJson("/api/transfer-requests/{$transferId}/complete")
            ->assertOk()
            ->assertJsonPath('transfer_request.status', 'completed')
            ->assertJsonPath('transfer_request.delivery_status', 'delivered');

        $this->assertDatabaseHas('transfer_logs', [
            'transfer_request_id' => $transferId,
            'action' => 'completed',
        ]);

        $this->assertDatabaseHas('transfer_logs', [
            'transfer_request_id' => $transferId,
            'action' => 'patient_arrived',
        ]);
    }

    public function test_users_cannot_create_transfer_to_their_own_hospital(): void
    {
        [$hospital] = $this->createHospitals();
        $user = $this->createUser($hospital, 'sending_staff');

        Sanctum::actingAs($user);

        $this->postJson('/api/transfer-requests', [
            'receiving_hospital_id' => $hospital->id,
            'patient_reference_code' => 'PT-2026-0002',
            'case_type' => 'general',
            'urgency_level' => 'normal',
            'privacy_confirmed' => true,
        ])->assertUnprocessable();
    }

    public function test_capacity_updates_are_limited_to_the_users_hospital(): void
    {
        [$ownHospital, $otherHospital] = $this->createHospitals();
        $user = $this->createUser($ownHospital, 'receiving_staff');

        Sanctum::actingAs($user);

        $payload = [
            'general_beds_available' => 9,
            'emergency_beds_available' => 4,
            'icu_beds_available' => 2,
            'ambulance_available' => 1,
        ];

        $this->putJson("/api/hospitals/{$otherHospital->id}/capacity", $payload)
            ->assertForbidden();

        $this->putJson("/api/hospitals/{$ownHospital->id}/capacity", $payload)
            ->assertOk()
            ->assertJsonPath('capacity.general_beds_available', 9);
    }

    public function test_reservation_fails_when_matching_capacity_is_unavailable(): void
    {
        [$sendingHospital, $receivingHospital] = $this->createHospitals([
            'icu_beds_available' => 0,
        ]);
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $receiver = $this->createUser($receivingHospital, 'receiving_staff');

        $transfer = TransferRequest::create([
            'sending_hospital_id' => $sendingHospital->id,
            'receiving_hospital_id' => $receivingHospital->id,
            'patient_reference_code' => 'PT-2026-0003',
            'case_type' => 'icu',
            'urgency_level' => 'critical',
            'status' => 'accepted',
            'created_by' => $sender->id,
            'accepted_by' => $receiver->id,
        ]);

        Sanctum::actingAs($receiver);

        $this->putJson("/api/transfer-requests/{$transfer->id}/reserve")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'No matching bed capacity is available at the receiving hospital.');
    }

    public function test_operational_actions_are_limited_to_staff_roles(): void
    {
        [$sendingHospital, $receivingHospital, $otherHospital] = $this->createHospitals();
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $receiver = $this->createUser($receivingHospital, 'receiving_staff');
        $coordinator = $this->createUser($otherHospital, 'coordinator');
        $admin = $this->createUser($otherHospital, 'admin');

        Sanctum::actingAs($receiver);
        $this->postJson('/api/transfer-requests', [
            'receiving_hospital_id' => $sendingHospital->id,
            'patient_reference_code' => 'PT-2026-0004',
            'case_type' => 'general',
            'urgency_level' => 'normal',
            'privacy_confirmed' => true,
        ])->assertForbidden();

        $transfer = TransferRequest::create([
            'sending_hospital_id' => $sendingHospital->id,
            'receiving_hospital_id' => $receivingHospital->id,
            'patient_reference_code' => 'PT-2026-0005',
            'case_type' => 'general',
            'urgency_level' => 'urgent',
            'status' => 'pending',
            'created_by' => $sender->id,
        ]);

        Sanctum::actingAs($coordinator);
        $this->putJson("/api/transfer-requests/{$transfer->id}/accept")
            ->assertForbidden();

        $this->putJson("/api/transfer-requests/{$transfer->id}/cancel")
            ->assertForbidden();

        Sanctum::actingAs($admin);
        $this->putJson("/api/hospitals/{$receivingHospital->id}/capacity", [
            'general_beds_available' => 9,
            'emergency_beds_available' => 4,
            'icu_beds_available' => 2,
            'ambulance_available' => 1,
        ])->assertForbidden();

        Sanctum::actingAs($sender);
        $this->putJson("/api/transfer-requests/{$transfer->id}/cancel")
            ->assertOk()
            ->assertJsonPath('transfer_request.status', 'cancelled');
    }

    public function test_role_specific_pages_are_restricted(): void
    {
        [$sendingHospital, $receivingHospital, $otherHospital] = $this->createHospitals();
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $receiver = $this->createUser($receivingHospital, 'receiving_staff');
        $coordinator = $this->createUser($otherHospital, 'coordinator');
        $admin = $this->createUser($otherHospital, 'admin');

        Sanctum::actingAs($sender);
        $this->getJson('/api/incoming-requests')->assertForbidden();
        $this->getJson('/api/analytics')->assertForbidden();
        $this->getJson('/api/transfer-board')->assertForbidden();
        $this->getJson('/api/audit-logs')->assertForbidden();

        Sanctum::actingAs($receiver);
        $this->getJson('/api/incoming-requests')->assertOk();
        $this->getJson('/api/analytics')->assertForbidden();

        Sanctum::actingAs($coordinator);
        $this->getJson('/api/transfer-board')->assertOk();
        $this->getJson('/api/analytics')->assertOk();

        Sanctum::actingAs($admin);
        $this->getJson('/api/transfer-board')->assertOk();
        $this->getJson('/api/audit-logs')->assertOk();
    }

    public function test_sending_staff_can_view_ranked_hospital_recommendations(): void
    {
        [$sendingHospital, $receivingHospital, $otherHospital] = $this->createHospitals([
            'icu_beds_available' => 1,
        ]);
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $receiver = $this->createUser($receivingHospital, 'receiving_staff');

        HospitalCapacity::where('hospital_id', $otherHospital->id)->first()->update([
            'icu_beds_available' => 6,
        ]);

        Sanctum::actingAs($sender);

        $this->getJson('/api/transfer-recommendations?case_type=icu')
            ->assertOk()
            ->assertJsonPath('recommendations.0.id', $otherHospital->id);

        Sanctum::actingAs($receiver);
        $this->getJson('/api/transfer-recommendations?case_type=icu')
            ->assertForbidden();
    }

    public function test_monitor_roles_can_escalate_active_transfers(): void
    {
        [$sendingHospital, $receivingHospital, $otherHospital] = $this->createHospitals();
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $coordinator = $this->createUser($otherHospital, 'coordinator');
        $receiver = $this->createUser($receivingHospital, 'receiving_staff');

        $transfer = TransferRequest::create([
            'sending_hospital_id' => $sendingHospital->id,
            'receiving_hospital_id' => $receivingHospital->id,
            'patient_reference_code' => 'PT-2026-0006',
            'case_type' => 'general',
            'urgency_level' => 'critical',
            'status' => 'pending',
            'created_by' => $sender->id,
        ]);

        Sanctum::actingAs($receiver);
        $this->putJson("/api/transfer-requests/{$transfer->id}/escalate", [
            'reason' => 'Waiting too long.',
        ])->assertForbidden();

        Sanctum::actingAs($coordinator);
        $this->putJson("/api/transfer-requests/{$transfer->id}/escalate", [
            'reason' => 'Waiting too long.',
        ])
            ->assertOk()
            ->assertJsonPath('transfer_request.is_escalated', true);

        $this->assertDatabaseHas('transfer_logs', [
            'transfer_request_id' => $transfer->id,
            'action' => 'escalated',
        ]);
    }

    public function test_intake_conditions_reservation_timer_and_handoff_notes_are_saved(): void
    {
        [$sendingHospital, $receivingHospital] = $this->createHospitals();
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $receiver = $this->createUser($receivingHospital, 'receiving_staff');

        Sanctum::actingAs($sender);
        $createResponse = $this->postJson('/api/transfer-requests', [
            'receiving_hospital_id' => $receivingHospital->id,
            'patient_reference_code' => 'PT-2026-0007',
            'case_type' => 'general',
            'urgency_level' => 'urgent',
            'rejection_reason' => 'No available bed',
            'placement_need' => 'General bed with observation',
            'documents_ready' => true,
            'document_checklist' => [
                'referral_note' => true,
                'lab_results' => true,
                'imaging' => true,
                'consent' => true,
                'transport_form' => true,
            ],
            'privacy_confirmed' => true,
        ])->assertCreated();

        $transferId = $createResponse->json('transfer_request.id');
        $this->assertDatabaseHas('transfer_requests', [
            'id' => $transferId,
            'rejection_reason' => 'No available bed',
            'documents_ready' => true,
        ]);

        Sanctum::actingAs($receiver);
        $this->putJson("/api/transfer-requests/{$transferId}/accept", [
            'accept_conditions' => 'Arrive before 5 PM.',
        ])->assertOk();

        $this->putJson("/api/transfer-requests/{$transferId}/reserve")
            ->assertOk()
            ->assertJsonPath('transfer_request.status', 'reserved');

        $transfer = TransferRequest::findOrFail($transferId);
        $this->assertNotNull($transfer->reserved_until);

        $transfer->update(['reserved_until' => now()->subMinute()]);
        Sanctum::actingAs($sender);
        $this->putJson("/api/transfer-requests/{$transferId}/transfer")
            ->assertUnprocessable();

        $transfer->refresh()->update([
            'status' => 'reserved',
            'reserved_until' => now()->addMinutes(20),
        ]);
        $this->putJson("/api/transfer-requests/{$transferId}/transfer")->assertOk();

        Sanctum::actingAs($receiver);
        $this->putJson("/api/transfer-requests/{$transferId}/arrive")->assertOk();
        $this->putJson("/api/transfer-requests/{$transferId}/complete", [
            'handoff_notes' => 'Accepted by receiving nurse.',
        ])->assertOk();

        $this->assertDatabaseHas('transfer_requests', [
            'id' => $transferId,
            'accept_conditions' => 'Arrive before 5 PM.',
            'handoff_notes' => 'Accepted by receiving nurse.',
        ]);
    }

    public function test_admin_settings_and_audit_filters_work(): void
    {
        [$sendingHospital, $receivingHospital, $otherHospital] = $this->createHospitals();
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $admin = $this->createUser($otherHospital, 'admin');
        $coordinator = $this->createUser($otherHospital, 'coordinator');

        Sanctum::actingAs($sender);
        $this->postJson('/api/transfer-requests', [
            'receiving_hospital_id' => $receivingHospital->id,
            'patient_reference_code' => 'PT-2026-0008',
            'case_type' => 'general',
            'urgency_level' => 'normal',
            'privacy_confirmed' => true,
        ])->assertCreated();

        Sanctum::actingAs($coordinator);
        $this->getJson('/api/admin/system-settings')->assertOk();

        Sanctum::actingAs($admin);
        $this->putJson('/api/admin/system-settings', [
            'reservation_minutes' => 45,
            'sla_pending_minutes' => 15,
            'case_types' => 'general, emergency, icu',
            'decline_reasons' => 'No bed, Staff unavailable',
            'bed_categories' => 'General, Emergency, ICU',
        ])->assertOk()
            ->assertJsonPath('settings.reservation_minutes', '45');

        $this->getJson('/api/audit-logs?action=created&q=PT-2026-0008')
            ->assertOk()
            ->assertJsonPath('audit_logs.data.0.action', 'created');
    }

    public function test_expired_reservations_release_capacity_and_return_to_accepted(): void
    {
        [$sendingHospital, $receivingHospital] = $this->createHospitals();
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $receiver = $this->createUser($receivingHospital, 'receiving_staff');

        HospitalCapacity::where('hospital_id', $receivingHospital->id)->first()->update([
            'general_beds_available' => 4,
        ]);

        $transfer = TransferRequest::create([
            'sending_hospital_id' => $sendingHospital->id,
            'receiving_hospital_id' => $receivingHospital->id,
            'patient_reference_code' => 'PT-2026-0009',
            'case_type' => 'general',
            'urgency_level' => 'normal',
            'status' => 'reserved',
            'created_by' => $sender->id,
            'accepted_by' => $receiver->id,
            'reserved_until' => now()->subMinute(),
            'privacy_confirmed' => true,
        ]);

        Sanctum::actingAs($sender);
        $this->getJson('/api/transfer-tracking')->assertOk();

        $transfer->refresh();

        $this->assertSame('accepted', $transfer->status);
        $this->assertNull($transfer->reserved_until);
        $this->assertDatabaseHas('hospital_capacities', [
            'hospital_id' => $receivingHospital->id,
            'general_beds_available' => 5,
        ]);
        $this->assertDatabaseHas('transfer_logs', [
            'transfer_request_id' => $transfer->id,
            'action' => 'reservation_expired',
        ]);
    }

    public function test_monitor_roles_can_export_transfer_and_audit_reports(): void
    {
        [$sendingHospital, $receivingHospital, $otherHospital] = $this->createHospitals();
        $sender = $this->createUser($sendingHospital, 'sending_staff');
        $admin = $this->createUser($otherHospital, 'admin');

        Sanctum::actingAs($sender);
        $this->postJson('/api/transfer-requests', [
            'receiving_hospital_id' => $receivingHospital->id,
            'patient_reference_code' => 'PT-2026-0010',
            'case_type' => 'general',
            'urgency_level' => 'normal',
            'privacy_confirmed' => true,
        ])->assertCreated();

        Sanctum::actingAs($admin);

        $transferExport = $this->get('/api/transfer-requests/export');
        $transferExport->assertOk();
        $this->assertStringContainsString('text/csv', $transferExport->headers->get('content-type'));

        $auditExport = $this->get('/api/audit-logs/export');
        $auditExport->assertOk();
        $this->assertStringContainsString('text/csv', $auditExport->headers->get('content-type'));
    }

    private function createHospitals(array $receivingCapacityOverrides = []): array
    {
        $sendingHospital = Hospital::create([
            'name' => 'City General Hospital',
            'address' => '123 Main St',
            'contact_number' => '555-0101',
            'status' => 'active',
        ]);

        $receivingHospital = Hospital::create([
            'name' => 'St. Mary Medical Center',
            'address' => '456 Oak Ave',
            'contact_number' => '555-0102',
            'status' => 'active',
        ]);

        $otherHospital = Hospital::create([
            'name' => 'Riverside Community Hospital',
            'address' => '789 River Rd',
            'contact_number' => '555-0103',
            'status' => 'active',
        ]);

        $defaultCapacity = [
            'general_beds_available' => 5,
            'emergency_beds_available' => 3,
            'icu_beds_available' => 2,
            'ambulance_available' => 1,
            'last_updated' => now(),
        ];

        foreach ([$sendingHospital, $otherHospital] as $hospital) {
            HospitalCapacity::create([
                'hospital_id' => $hospital->id,
                ...$defaultCapacity,
            ]);
        }

        HospitalCapacity::create([
            'hospital_id' => $receivingHospital->id,
            ...$defaultCapacity,
            ...$receivingCapacityOverrides,
        ]);

        return [$sendingHospital, $receivingHospital, $otherHospital];
    }

    private function createUser(Hospital $hospital, string $role): User
    {
        return User::create([
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password',
            'role' => $role,
            'hospital_id' => $hospital->id,
        ]);
    }
}
