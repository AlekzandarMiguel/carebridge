<?php

namespace Database\Seeders;

use App\Models\TransferLog;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

class SampleCaseSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::whereIn('email', [
            'intake.bpmc@carebridge.com',
            'intake.bethel@carebridge.com',
            'intake.malaybalay@carebridge.com',
            'acceptance.bethel@carebridge.com',
            'acceptance.malaybalay@carebridge.com',
            'acceptance.adventistvalencia@carebridge.com',
            'acceptance.valenciapolymedic@carebridge.com',
            'coordinator@carebridge.com',
            'dispatcher@carebridge.com',
        ])->get()->keyBy('email');

        $requiredEmails = [
            'intake.bpmc@carebridge.com',
            'intake.bethel@carebridge.com',
            'intake.malaybalay@carebridge.com',
            'acceptance.bethel@carebridge.com',
            'acceptance.malaybalay@carebridge.com',
            'acceptance.adventistvalencia@carebridge.com',
            'acceptance.valenciapolymedic@carebridge.com',
            'coordinator@carebridge.com',
            'dispatcher@carebridge.com',
        ];

        foreach ($requiredEmails as $email) {
            if (!$users->has($email)) {
                $this->command?->warn("Skipping sample cases because {$email} is missing. Run HospitalSeeder and UserSeeder first.");

                return;
            }
        }

        $now = now();

        $cases = [
            [
                'patient_reference_code' => 'CB-CASE-2026-001',
                'sending_hospital_id' => 1,
                'receiving_hospital_id' => 2,
                'created_by' => $users['intake.bpmc@carebridge.com']->id,
                'accepted_by' => $users['acceptance.bethel@carebridge.com']->id,
                'case_type' => 'icu',
                'urgency_level' => 'critical',
                'notes' => 'Initial receiving area is full. Patient-safe referral needs ICU-capable placement.',
                'rejection_reason' => 'No ICU bed available at origin',
                'placement_need' => 'ICU bed with monitored transport',
                'documents_ready' => true,
                'privacy_confirmed' => true,
                'status' => 'declined',
                'delivery_status' => 'not_started',
                'decline_reason_category' => 'No matching bed',
                'coordinator_notes' => 'Returned to search queue for another accepting hospital.',
                'created_at' => $now->copy()->subMinutes(92),
                'updated_at' => $now->copy()->subMinutes(71),
                'logs' => [
                    ['user' => 'intake.bpmc@carebridge.com', 'action' => 'created', 'remarks' => 'Rejected patient placement case created.', 'minutes_ago' => 92],
                    ['user' => 'acceptance.bethel@carebridge.com', 'action' => 'declined', 'remarks' => 'Declined because no matching ICU bed is available.', 'minutes_ago' => 71],
                ],
            ],
            [
                'patient_reference_code' => 'CB-CASE-2026-002',
                'sending_hospital_id' => 2,
                'receiving_hospital_id' => 3,
                'created_by' => $users['intake.bethel@carebridge.com']->id,
                'case_type' => 'emergency',
                'urgency_level' => 'urgent',
                'notes' => 'Emergency department overflow. Needs accepting hospital confirmation.',
                'rejection_reason' => 'Emergency area full',
                'placement_need' => 'Emergency bed and rapid acceptance',
                'documents_ready' => true,
                'privacy_confirmed' => true,
                'status' => 'pending',
                'delivery_status' => 'not_started',
                'is_escalated' => true,
                'escalated_by' => $users['coordinator@carebridge.com']->id,
                'escalated_at' => $now->copy()->subMinutes(26),
                'escalation_reason' => 'Waiting longer than SLA without final acceptance.',
                'coordinator_notes' => 'Coordinator following up with acceptance desk.',
                'created_at' => $now->copy()->subMinutes(47),
                'updated_at' => $now->copy()->subMinutes(26),
                'logs' => [
                    ['user' => 'intake.bethel@carebridge.com', 'action' => 'created', 'remarks' => 'Rejected patient placement case created.', 'minutes_ago' => 47],
                    ['user' => 'coordinator@carebridge.com', 'action' => 'escalated', 'remarks' => 'Waiting longer than SLA without final acceptance.', 'minutes_ago' => 26],
                ],
            ],
            [
                'patient_reference_code' => 'CB-CASE-2026-003',
                'sending_hospital_id' => 3,
                'receiving_hospital_id' => 4,
                'created_by' => $users['intake.malaybalay@carebridge.com']->id,
                'accepted_by' => $users['acceptance.adventistvalencia@carebridge.com']->id,
                'case_type' => 'general',
                'urgency_level' => 'normal',
                'notes' => 'Origin ward is full. Acceptance staff confirmed available receiving capacity.',
                'rejection_reason' => 'General ward full',
                'placement_need' => 'General bed',
                'documents_ready' => true,
                'privacy_confirmed' => true,
                'status' => 'accepted',
                'delivery_status' => 'not_started',
                'accept_conditions' => 'Prepare referral summary before dispatch.',
                'created_at' => $now->copy()->subMinutes(34),
                'updated_at' => $now->copy()->subMinutes(18),
                'logs' => [
                    ['user' => 'intake.malaybalay@carebridge.com', 'action' => 'created', 'remarks' => 'Rejected patient placement case created.', 'minutes_ago' => 34],
                    ['user' => 'acceptance.adventistvalencia@carebridge.com', 'action' => 'accepted', 'remarks' => 'Accepted with referral summary requirement.', 'minutes_ago' => 18],
                ],
            ],
            [
                'patient_reference_code' => 'CB-CASE-2026-004',
                'sending_hospital_id' => 1,
                'receiving_hospital_id' => 5,
                'created_by' => $users['intake.bpmc@carebridge.com']->id,
                'accepted_by' => $users['acceptance.valenciapolymedic@carebridge.com']->id,
                'assigned_dispatcher_id' => $users['dispatcher@carebridge.com']->id,
                'assigned_at' => $now->copy()->subMinutes(15),
                'case_type' => 'general',
                'urgency_level' => 'urgent',
                'notes' => 'Capacity has been reserved. Waiting for ambulance team to begin transport.',
                'rejection_reason' => 'No available ward bed',
                'placement_need' => 'General bed with ambulance transfer',
                'documents_ready' => true,
                'privacy_confirmed' => true,
                'status' => 'reserved',
                'delivery_status' => 'not_started',
                'reserved_until' => $now->copy()->addMinutes(45),
                'transport_team' => 'CareBridge Transport Team A',
                'ambulance_unit' => 'CB-AMB-01',
                'transport_contact' => 'Dispatcher line',
                'route_distance_km' => 31.50,
                'estimated_travel_minutes' => 42,
                'created_at' => $now->copy()->subMinutes(42),
                'updated_at' => $now->copy()->subMinutes(15),
                'logs' => [
                    ['user' => 'intake.bpmc@carebridge.com', 'action' => 'created', 'remarks' => 'Rejected patient placement case created.', 'minutes_ago' => 42],
                    ['user' => 'acceptance.valenciapolymedic@carebridge.com', 'action' => 'accepted', 'remarks' => 'Accepted for reserved capacity.', 'minutes_ago' => 26],
                    ['user' => 'acceptance.valenciapolymedic@carebridge.com', 'action' => 'reserved', 'remarks' => 'Capacity slot reserved.', 'minutes_ago' => 20],
                    ['user' => 'coordinator@carebridge.com', 'action' => 'assigned', 'remarks' => 'Assigned to dispatcher for delivery monitoring.', 'minutes_ago' => 15],
                ],
            ],
            [
                'patient_reference_code' => 'CB-CASE-2026-005',
                'sending_hospital_id' => 2,
                'receiving_hospital_id' => 4,
                'created_by' => $users['intake.bethel@carebridge.com']->id,
                'accepted_by' => $users['acceptance.adventistvalencia@carebridge.com']->id,
                'assigned_dispatcher_id' => $users['dispatcher@carebridge.com']->id,
                'assigned_at' => $now->copy()->subMinutes(38),
                'case_type' => 'emergency',
                'urgency_level' => 'critical',
                'notes' => 'Patient is currently moving to accepting hospital.',
                'rejection_reason' => 'Emergency room capacity exceeded',
                'placement_need' => 'Emergency bed with monitored delivery',
                'documents_ready' => true,
                'privacy_confirmed' => true,
                'status' => 'in_transfer',
                'delivery_status' => 'en_route',
                'delivery_started_at' => $now->copy()->subMinutes(24),
                'delivery_last_location' => 'Along Sayre Highway',
                'delivery_notes' => 'Stable during transport, dispatcher monitoring ETA.',
                'transport_team' => 'CareBridge Transport Team B',
                'ambulance_unit' => 'CB-AMB-02',
                'transport_contact' => 'Dispatcher line',
                'estimated_arrival_at' => $now->copy()->addMinutes(18),
                'route_distance_km' => 29.20,
                'estimated_travel_minutes' => 45,
                'delivery_events' => [
                    $this->deliveryEvent('departed', 'Departed', 'Origin ambulance bay', 'Patient departed from origin.', 24),
                    $this->deliveryEvent('location_update', 'Location update', 'Along Sayre Highway', 'ETA remains on track.', 9),
                ],
                'created_at' => $now->copy()->subMinutes(68),
                'updated_at' => $now->copy()->subMinutes(9),
                'logs' => [
                    ['user' => 'intake.bethel@carebridge.com', 'action' => 'created', 'remarks' => 'Rejected patient placement case created.', 'minutes_ago' => 68],
                    ['user' => 'acceptance.adventistvalencia@carebridge.com', 'action' => 'accepted', 'remarks' => 'Accepted for emergency placement.', 'minutes_ago' => 55],
                    ['user' => 'acceptance.adventistvalencia@carebridge.com', 'action' => 'reserved', 'remarks' => 'Emergency bed reserved.', 'minutes_ago' => 48],
                    ['user' => 'dispatcher@carebridge.com', 'action' => 'in_transfer', 'remarks' => 'Patient delivery is in progress.', 'minutes_ago' => 24],
                    ['user' => 'dispatcher@carebridge.com', 'action' => 'delivery_update', 'remarks' => 'Location update: Along Sayre Highway.', 'minutes_ago' => 9],
                ],
            ],
            [
                'patient_reference_code' => 'CB-CASE-2026-006',
                'sending_hospital_id' => 3,
                'receiving_hospital_id' => 2,
                'created_by' => $users['intake.malaybalay@carebridge.com']->id,
                'accepted_by' => $users['acceptance.bethel@carebridge.com']->id,
                'assigned_dispatcher_id' => $users['dispatcher@carebridge.com']->id,
                'assigned_at' => $now->copy()->subMinutes(58),
                'case_type' => 'general',
                'urgency_level' => 'normal',
                'notes' => 'Patient has arrived and awaits final handoff confirmation.',
                'rejection_reason' => 'No available observation bed',
                'placement_need' => 'Observation bed',
                'documents_ready' => true,
                'privacy_confirmed' => true,
                'status' => 'in_transfer',
                'delivery_status' => 'arrived',
                'delivery_started_at' => $now->copy()->subMinutes(37),
                'patient_arrived_at' => $now->copy()->subMinutes(7),
                'delivery_last_location' => 'Accepting hospital receiving area',
                'transport_team' => 'CareBridge Transport Team C',
                'ambulance_unit' => 'CB-AMB-03',
                'transport_contact' => 'Dispatcher line',
                'estimated_arrival_at' => $now->copy()->subMinutes(5),
                'route_distance_km' => 5.40,
                'estimated_travel_minutes' => 16,
                'delivery_events' => [
                    $this->deliveryEvent('departed', 'Departed', 'Origin ambulance bay', 'Patient departed from origin.', 37),
                    $this->deliveryEvent('arrived_gate', 'Arrived at accepting area', 'Accepting hospital receiving area', 'Patient arrived for handoff.', 7),
                ],
                'created_at' => $now->copy()->subMinutes(74),
                'updated_at' => $now->copy()->subMinutes(7),
                'logs' => [
                    ['user' => 'intake.malaybalay@carebridge.com', 'action' => 'created', 'remarks' => 'Rejected patient placement case created.', 'minutes_ago' => 74],
                    ['user' => 'acceptance.bethel@carebridge.com', 'action' => 'accepted', 'remarks' => 'Accepted for observation placement.', 'minutes_ago' => 62],
                    ['user' => 'dispatcher@carebridge.com', 'action' => 'in_transfer', 'remarks' => 'Patient delivery is in progress.', 'minutes_ago' => 37],
                    ['user' => 'dispatcher@carebridge.com', 'action' => 'patient_arrived', 'remarks' => 'Patient arrived at accepting hospital.', 'minutes_ago' => 7],
                ],
            ],
            [
                'patient_reference_code' => 'CB-CASE-2026-007',
                'sending_hospital_id' => 1,
                'receiving_hospital_id' => 3,
                'created_by' => $users['intake.bpmc@carebridge.com']->id,
                'accepted_by' => $users['acceptance.malaybalay@carebridge.com']->id,
                'assigned_dispatcher_id' => $users['dispatcher@carebridge.com']->id,
                'assigned_at' => $now->copy()->subHours(3)->subMinutes(10),
                'case_type' => 'icu',
                'urgency_level' => 'critical',
                'notes' => 'Completed sample case showing full placement and delivery closure.',
                'rejection_reason' => 'Origin unit at full capacity',
                'placement_need' => 'ICU bed',
                'documents_ready' => true,
                'privacy_confirmed' => true,
                'status' => 'completed',
                'delivery_status' => 'delivered',
                'delivery_started_at' => $now->copy()->subHours(2)->subMinutes(42),
                'patient_arrived_at' => $now->copy()->subHours(2)->subMinutes(3),
                'delivery_completed_at' => $now->copy()->subHours(1)->subMinutes(51),
                'delivery_last_location' => 'Handoff completed',
                'delivery_notes' => 'Patient placed and receiving team completed handoff.',
                'transport_team' => 'CareBridge Transport Team A',
                'ambulance_unit' => 'CB-AMB-01',
                'transport_contact' => 'Dispatcher line',
                'estimated_arrival_at' => $now->copy()->subHours(2)->subMinutes(8),
                'route_distance_km' => 4.80,
                'estimated_travel_minutes' => 14,
                'handoff_notes' => 'Receiving team accepted patient and completed handoff checklist.',
                'delivery_events' => [
                    $this->deliveryEvent('departed', 'Departed', 'Origin ambulance bay', 'Patient departed from origin.', 162),
                    $this->deliveryEvent('arrived_gate', 'Arrived at accepting area', 'Accepting hospital receiving area', 'Patient arrived for handoff.', 123),
                    $this->deliveryEvent('handoff_completed', 'Handoff completed', 'Receiving unit', 'Final receiving handoff completed.', 111),
                ],
                'created_at' => $now->copy()->subHours(3)->subMinutes(35),
                'updated_at' => $now->copy()->subHours(1)->subMinutes(51),
                'logs' => [
                    ['user' => 'intake.bpmc@carebridge.com', 'action' => 'created', 'remarks' => 'Rejected patient placement case created.', 'minutes_ago' => 215],
                    ['user' => 'acceptance.malaybalay@carebridge.com', 'action' => 'accepted', 'remarks' => 'Accepted for ICU placement.', 'minutes_ago' => 199],
                    ['user' => 'acceptance.malaybalay@carebridge.com', 'action' => 'reserved', 'remarks' => 'ICU bed reserved.', 'minutes_ago' => 188],
                    ['user' => 'dispatcher@carebridge.com', 'action' => 'in_transfer', 'remarks' => 'Patient delivery is in progress.', 'minutes_ago' => 162],
                    ['user' => 'dispatcher@carebridge.com', 'action' => 'patient_arrived', 'remarks' => 'Patient arrived at accepting hospital.', 'minutes_ago' => 123],
                    ['user' => 'acceptance.malaybalay@carebridge.com', 'action' => 'completed', 'remarks' => 'Patient placement and delivery completed successfully.', 'minutes_ago' => 111],
                ],
            ],
        ];

        $caseDefaults = [
            'accepted_by' => null,
            'assigned_dispatcher_id' => null,
            'assigned_at' => null,
            'accept_conditions' => null,
            'reserved_until' => null,
            'handoff_notes' => null,
            'coordinator_notes' => null,
            'delivery_started_at' => null,
            'patient_arrived_at' => null,
            'delivery_completed_at' => null,
            'delivery_last_location' => null,
            'delivery_notes' => null,
            'transport_team' => null,
            'ambulance_unit' => null,
            'transport_contact' => null,
            'estimated_arrival_at' => null,
            'route_distance_km' => null,
            'estimated_travel_minutes' => null,
            'delivery_events' => null,
            'decline_reason_category' => null,
            'is_escalated' => false,
            'escalated_by' => null,
            'escalated_at' => null,
            'escalation_reason' => null,
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
        ];

        foreach ($cases as $case) {
            $logs = $case['logs'];
            unset($case['logs']);

            $createdAt = $case['created_at'];
            $updatedAt = $case['updated_at'];
            unset($case['created_at'], $case['updated_at']);

            $case = array_merge($caseDefaults, $case);

            $case['document_checklist'] = [
                'Referral summary',
                'Capacity rejection note',
                'Transport clearance',
            ];

            $transfer = TransferRequest::updateOrCreate(
                ['patient_reference_code' => $case['patient_reference_code']],
                $case,
            );

            $transfer->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $updatedAt,
            ])->saveQuietly();

            TransferLog::where('transfer_request_id', $transfer->id)->delete();

            foreach ($logs as $log) {
                $logUser = $users[$log['user']];
                $createdAt = $now->copy()->subMinutes($log['minutes_ago']);

                TransferLog::create([
                    'transfer_request_id' => $transfer->id,
                    'user_id' => $logUser->id,
                    'action' => $log['action'],
                    'remarks' => $log['remarks'],
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }
        }
    }

    private function deliveryEvent(string $eventType, string $label, string $location, string $notes, int $minutesAgo): array
    {
        return [
            'event_type' => $eventType,
            'label' => $label,
            'location' => $location,
            'notes' => $notes,
            'occurred_at' => now()->subMinutes($minutesAgo)->toISOString(),
        ];
    }
}
