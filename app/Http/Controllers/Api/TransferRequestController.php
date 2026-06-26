<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;
use App\Models\HospitalCapacity;
use App\Models\SystemSetting;
use App\Models\TransferRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransferRequestController extends Controller
{
    private const MONITOR_ROLES = ['coordinator', 'admin'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $hospitalId = $user->hospital_id;

        $requests = TransferRequest::with(['sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'escalator', 'logs.user'])
            ->when(!in_array($user->role, self::MONITOR_ROLES), function ($q) use ($hospitalId) {
                $q->where('sending_hospital_id', $hospitalId)
                  ->orWhere('receiving_hospital_id', $hospitalId);
            })
            ->orderByRaw("CASE urgency_level WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END")
            ->latest()
            ->paginate(15);

        return response()->json([
            'transfer_requests' => $requests,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'sending_staff') {
            return response()->json(['message' => 'Only sending staff can create transfer requests.'], 403);
        }

        if (!$user->hospital_id) {
            return response()->json(['message' => 'Your account is not assigned to a hospital.'], 422);
        }

        $validated = $request->validate([
            'receiving_hospital_id' => 'required|exists:hospitals,id',
            'patient_reference_code' => 'required|string|max:50',
            'case_type' => 'required|in:general,emergency,icu',
            'urgency_level' => 'required|in:normal,urgent,critical',
            'notes' => 'nullable|string|max:500',
            'rejection_reason' => 'nullable|string|max:120',
            'placement_need' => 'nullable|string|max:120',
            'documents_ready' => 'boolean',
            'transport_team' => 'nullable|string|max:120',
            'ambulance_unit' => 'nullable|string|max:80',
            'transport_contact' => 'nullable|string|max:80',
            'estimated_arrival_at' => 'nullable|date',
        ]);

        if ((int) $validated['receiving_hospital_id'] === (int) $user->hospital_id) {
            return response()->json(['message' => 'Receiving hospital must be different from your hospital.'], 422);
        }

        $transferRequest = TransferRequest::create([
            ...$validated,
            'sending_hospital_id' => $user->hospital_id,
            'status' => 'pending',
            'created_by' => $user->id,
        ]);

        $transferRequest->logAction($user->id, 'created', 'Transfer request created.');

        return response()->json([
            'message' => 'Transfer request created successfully.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator'),
        ], 201);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'sending_staff') {
            return response()->json(['message' => 'Only sending staff can view receiving hospital recommendations.'], 403);
        }

        $validated = $request->validate([
            'case_type' => 'nullable|in:general,emergency,icu',
        ]);
        $caseType = $validated['case_type'] ?? 'general';
        $bedColumn = $this->bedColumnForCaseType($caseType);

        $hospitals = Hospital::with('latestCapacity')
            ->where('status', 'active')
            ->whereKeyNot($user->hospital_id)
            ->get()
            ->map(function (Hospital $hospital) use ($bedColumn) {
                $capacity = $hospital->latestCapacity;
                $matchingBeds = $capacity?->{$bedColumn} ?? 0;
                $totalBeds = $capacity
                    ? $capacity->general_beds_available + $capacity->emergency_beds_available + $capacity->icu_beds_available
                    : 0;

                return [
                    'id' => $hospital->id,
                    'name' => $hospital->name,
                    'address' => $hospital->address,
                    'contact_number' => $hospital->contact_number,
                    'latest_capacity' => $capacity,
                    'matching_beds' => $matchingBeds,
                    'total_beds' => $totalBeds,
                    'recommendation_score' => ($matchingBeds * 10) + $totalBeds + (($capacity?->ambulance_available ?? 0) * 2),
                ];
            })
            ->sortByDesc('recommendation_score')
            ->values()
            ->take(5);

        return response()->json([
            'recommendations' => $hospitals,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::with([
            'sendingHospital',
            'receivingHospital',
            'creator',
            'acceptor',
            'escalator',
            'logs.user',
        ])->findOrFail($id);

        if (!$this->canAccessTransfer($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to view this transfer request.'], 403);
        }

        return response()->json([
            'transfer_request' => $transferRequest,
        ]);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the receiving hospital can accept this request.'], 403);
        }

        if ($transferRequest->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be accepted.'], 422);
        }

        $user = $request->user();
        $validated = $request->validate([
            'accept_conditions' => 'nullable|string|max:500',
        ]);
        $transferRequest->update([
            'status' => 'accepted',
            'accepted_by' => $user->id,
            'accept_conditions' => $validated['accept_conditions'] ?? null,
        ]);

        $remarks = $validated['accept_conditions']
            ?? 'Request accepted by receiving hospital.';
        $transferRequest->logAction($user->id, 'accepted', $remarks);

        return response()->json([
            'message' => 'Transfer request accepted.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor'),
        ]);
    }

    public function decline(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the receiving hospital can decline this request.'], 403);
        }

        if ($transferRequest->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be declined.'], 422);
        }

        $user = $request->user();
        $validated = $request->validate([
            'decline_reason_category' => 'required|string|in:no_general_bed,no_icu_bed,no_emergency_bed,no_ambulance,staff_unavailable,case_not_supported,other',
            'remarks' => 'nullable|string|max:500',
        ]);
        $reasonLabels = [
            'no_general_bed' => 'No general bed',
            'no_icu_bed' => 'No ICU bed',
            'no_emergency_bed' => 'No emergency bed',
            'no_ambulance' => 'No ambulance available',
            'staff_unavailable' => 'Staff unavailable',
            'case_not_supported' => 'Case not supported',
            'other' => 'Other',
        ];
        $remarks = $validated['remarks'] ?? $reasonLabels[$validated['decline_reason_category']];

        $transferRequest->update([
            'status' => 'declined',
            'decline_reason_category' => $validated['decline_reason_category'],
        ]);

        $transferRequest->logAction($user->id, 'declined', $remarks);

        return response()->json([
            'message' => 'Transfer request declined.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor'),
        ]);
    }

    public function reserve(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the receiving hospital can reserve capacity for this request.'], 403);
        }

        if ($transferRequest->status !== 'accepted') {
            return response()->json(['message' => 'Only accepted requests can be reserved.'], 422);
        }

        $user = $request->user();

        $reservedTransfer = DB::transaction(function () use ($transferRequest, $user) {
            $reservationMinutes = (int) (SystemSetting::where('key', 'reservation_minutes')->value('value') ?? 30);
            $bedColumn = $this->bedColumnForCaseType($transferRequest->case_type);
            $capacity = HospitalCapacity::where('hospital_id', $transferRequest->receiving_hospital_id)
                ->latest()
                ->lockForUpdate()
                ->first();

            if (!$capacity || $capacity->{$bedColumn} < 1) {
                return null;
            }

            $capacity->update([
                $bedColumn => $capacity->{$bedColumn} - 1,
                'last_updated' => now(),
            ]);

            $transferRequest->update([
                'status' => 'reserved',
                'reserved_until' => now()->addMinutes(max(5, $reservationMinutes)),
            ]);

            $transferRequest->logAction($user->id, 'reserved', "Slot reserved at receiving hospital for {$reservationMinutes} minutes.");

            return $transferRequest;
        });

        if (!$reservedTransfer) {
            return response()->json(['message' => 'No matching bed capacity is available at the receiving hospital.'], 422);
        }

        return response()->json([
            'message' => 'Slot reserved successfully.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor'),
        ]);
    }

    public function startTransfer(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsSendingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the sending hospital can start this transfer.'], 403);
        }

        if ($transferRequest->status !== 'reserved') {
            return response()->json(['message' => 'Only reserved requests can start transfer.'], 422);
        }

        if ($transferRequest->reserved_until && now()->greaterThan($transferRequest->reserved_until)) {
            return response()->json(['message' => 'The reservation timer has expired. Ask the receiving hospital to reserve again.'], 422);
        }

        $validated = $request->validate([
            'delivery_last_location' => 'nullable|string|max:120',
            'delivery_notes' => 'nullable|string|max:500',
            'transport_team' => 'nullable|string|max:120',
            'ambulance_unit' => 'nullable|string|max:80',
            'transport_contact' => 'nullable|string|max:80',
            'estimated_arrival_at' => 'nullable|date',
        ]);

        $user = $request->user();
        $transferRequest->update([
            'status' => 'in_transfer',
            'delivery_status' => 'en_route',
            'delivery_started_at' => now(),
            'delivery_last_location' => $validated['delivery_last_location'] ?? 'Departed from sending hospital',
            'delivery_notes' => $validated['delivery_notes'] ?? $transferRequest->delivery_notes,
            'transport_team' => $validated['transport_team'] ?? $transferRequest->transport_team,
            'ambulance_unit' => $validated['ambulance_unit'] ?? $transferRequest->ambulance_unit,
            'transport_contact' => $validated['transport_contact'] ?? $transferRequest->transport_contact,
            'estimated_arrival_at' => $validated['estimated_arrival_at'] ?? $transferRequest->estimated_arrival_at,
        ]);

        $transferRequest->logAction($user->id, 'in_transfer', 'Patient transfer in progress.');

        return response()->json([
            'message' => 'Transfer started.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor'),
        ]);
    }

    public function markArrived(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the receiving hospital can mark patient arrival.'], 403);
        }

        if ($transferRequest->status !== 'in_transfer') {
            return response()->json(['message' => 'Only in-transfer requests can be marked as arrived.'], 422);
        }

        if ($transferRequest->delivery_status === 'delivered') {
            return response()->json(['message' => 'This patient delivery is already completed.'], 422);
        }

        $validated = $request->validate([
            'delivery_last_location' => 'nullable|string|max:120',
            'delivery_notes' => 'nullable|string|max:500',
            'handoff_notes' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $transferRequest->update([
            'delivery_status' => 'arrived',
            'patient_arrived_at' => now(),
            'delivery_last_location' => $validated['delivery_last_location'] ?? 'Arrived at receiving hospital',
            'delivery_notes' => $validated['delivery_notes'] ?? $transferRequest->delivery_notes,
            'handoff_notes' => $validated['handoff_notes'] ?? $transferRequest->handoff_notes,
        ]);

        $transferRequest->logAction($user->id, 'patient_arrived', 'Patient arrived at receiving hospital.');

        return response()->json([
            'message' => 'Patient arrival recorded.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor'),
        ]);
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the receiving hospital can complete this transfer.'], 403);
        }

        if ($transferRequest->status !== 'in_transfer') {
            return response()->json(['message' => 'Only in-transfer requests can be completed.'], 422);
        }

        $validated = $request->validate([
            'delivery_notes' => 'nullable|string|max:500',
            'handoff_notes' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $transferRequest->update([
            'status' => 'completed',
            'delivery_status' => 'delivered',
            'patient_arrived_at' => $transferRequest->patient_arrived_at ?? now(),
            'delivery_completed_at' => now(),
            'delivery_last_location' => 'Delivered to receiving hospital care team',
            'delivery_notes' => $validated['delivery_notes'] ?? $transferRequest->delivery_notes,
            'handoff_notes' => $validated['handoff_notes'] ?? $transferRequest->handoff_notes,
        ]);

        $transferRequest->logAction($user->id, 'completed', 'Patient transfer completed successfully.');

        return response()->json([
            'message' => 'Transfer completed.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor'),
        ]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canAccessTransfer($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to cancel this transfer request.'], 403);
        }

        if (!$this->canActAsSendingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the sending hospital can cancel this transfer request.'], 403);
        }

        if (!in_array($transferRequest->status, ['pending', 'accepted', 'reserved'])) {
            return response()->json(['message' => 'This request cannot be cancelled in its current status.'], 422);
        }

        $user = $request->user();
        $remarks = $request->input('remarks', 'Transfer cancelled.');

        $transferRequest->update([
            'status' => 'cancelled',
        ]);

        $transferRequest->logAction($user->id, 'cancelled', $remarks);

        return response()->json([
            'message' => 'Transfer cancelled.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor'),
        ]);
    }

    public function escalate(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only coordinators and admins can escalate transfer requests.'], 403);
        }

        $transferRequest = TransferRequest::findOrFail($id);

        if (!in_array($transferRequest->status, ['pending', 'accepted', 'reserved', 'in_transfer'])) {
            return response()->json(['message' => 'Only active transfer requests can be escalated.'], 422);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);
        $reason = $validated['reason'] ?? 'Coordinator escalation requested.';

        $transferRequest->update([
            'is_escalated' => true,
            'escalated_by' => $user->id,
            'escalated_at' => now(),
            'escalation_reason' => $reason,
        ]);

        $transferRequest->logAction($user->id, 'escalated', $reason);

        return response()->json([
            'message' => 'Transfer request escalated.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'escalator'),
        ]);
    }

    public function updateCoordinatorNotes(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only coordinators and admins can add coordinator notes.'], 403);
        }

        $transferRequest = TransferRequest::findOrFail($id);
        $validated = $request->validate([
            'coordinator_notes' => 'nullable|string|max:1000',
        ]);

        $transferRequest->update([
            'coordinator_notes' => $validated['coordinator_notes'] ?? null,
        ]);

        $transferRequest->logAction($user->id, 'coordinator_note', 'Coordinator notes updated.');

        return response()->json([
            'message' => 'Coordinator notes updated.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'escalator'),
        ]);
    }

    public function board(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only coordinators and admins can view the command board.'], 403);
        }

        $hospitalId = $user->hospital_id;
        $statuses = ['pending', 'accepted', 'reserved', 'in_transfer', 'completed', 'declined'];
        $requests = TransferRequest::with(['sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'escalator'])
            ->whereIn('status', $statuses)
            ->when(!in_array($user->role, self::MONITOR_ROLES), function ($q) use ($hospitalId) {
                $q->where(function ($scoped) use ($hospitalId) {
                    $scoped->where('sending_hospital_id', $hospitalId)
                        ->orWhere('receiving_hospital_id', $hospitalId);
                });
            })
            ->orderByRaw("CASE urgency_level WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END")
            ->latest()
            ->get()
            ->groupBy('status');

        return response()->json([
            'board' => collect($statuses)->mapWithKeys(fn ($status) => [
                $status => $requests->get($status, collect())->values(),
            ]),
        ]);
    }

    private function canAccessTransfer(Request $request, TransferRequest $transferRequest): bool
    {
        $user = $request->user();

        return in_array($user->role, self::MONITOR_ROLES)
            || (int) $transferRequest->sending_hospital_id === (int) $user->hospital_id
            || (int) $transferRequest->receiving_hospital_id === (int) $user->hospital_id;
    }

    private function canActAsReceivingHospital(Request $request, TransferRequest $transferRequest): bool
    {
        $user = $request->user();

        return $user->role === 'receiving_staff'
            && (int) $transferRequest->receiving_hospital_id === (int) $user->hospital_id;
    }

    private function canActAsSendingHospital(Request $request, TransferRequest $transferRequest): bool
    {
        $user = $request->user();

        return $user->role === 'sending_staff'
            && (int) $transferRequest->sending_hospital_id === (int) $user->hospital_id;
    }

    private function bedColumnForCaseType(string $caseType): string
    {
        return match ($caseType) {
            'emergency' => 'emergency_beds_available',
            'icu' => 'icu_beds_available',
            default => 'general_beds_available',
        };
    }
}
