<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;
use App\Models\HospitalCapacity;
use App\Models\SystemSetting;
use App\Models\TransferAttachment;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransferRequestController extends Controller
{
    private const MONITOR_ROLES = ['coordinator', 'dispatcher', 'admin'];

    public function index(Request $request): JsonResponse
    {
        $this->releaseExpiredReservations();

        $user = $request->user();
        $validated = $request->validate([
            'q' => 'nullable|string|max:120',
            'status' => 'nullable|string|max:40',
            'urgency_level' => 'nullable|in:normal,urgent,critical',
            'case_type' => 'nullable|in:general,emergency,icu',
            'delivery_status' => 'nullable|in:not_started,en_route,arrived,delivered',
            'archived' => 'nullable|in:with,only,without',
        ]);

        $requests = $this->visibleTransferQuery($request)
            ->when($validated['q'] ?? null, function ($q, $search) {
                $q->where(function ($scoped) use ($search) {
                    $scoped->where('patient_reference_code', 'like', "%{$search}%")
                        ->orWhere('placement_need', 'like', "%{$search}%")
                        ->orWhere('rejection_reason', 'like', "%{$search}%")
                        ->orWhereHas('sendingHospital', fn ($hospital) => $hospital->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('receivingHospital', fn ($hospital) => $hospital->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($validated['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($validated['urgency_level'] ?? null, fn ($q, $urgency) => $q->where('urgency_level', $urgency))
            ->when($validated['case_type'] ?? null, fn ($q, $caseType) => $q->where('case_type', $caseType))
            ->when($validated['delivery_status'] ?? null, fn ($q, $deliveryStatus) => $q->where('delivery_status', $deliveryStatus))
            ->when(($validated['archived'] ?? 'without') === 'only', fn ($q) => $q->whereNotNull('archived_at'))
            ->when(($validated['archived'] ?? 'without') === 'without', fn ($q) => $q->whereNull('archived_at'))
            ->orderByRaw("CASE urgency_level WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END")
            ->latest()
            ->paginate(15)
            ->appends($request->query());

        return response()->json([
            'transfer_requests' => $requests,
        ]);
    }

    public function export(Request $request)
    {
        $this->releaseExpiredReservations();

        if (!in_array($request->user()->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only department monitors can export placement reports.'], 403);
        }

        $rows = $this->visibleTransferQuery($request)
            ->orderByDesc('created_at')
            ->get();

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Reference',
                'Status',
                'Delivery Status',
                'Case Type',
                'Urgency',
                'Sending Hospital',
                'Receiving Hospital',
                'Dispatcher',
                'Created At',
                'Reserved Until',
                'Distance KM',
                'ETA Minutes',
                'Escalated',
            ]);

            foreach ($rows as $transfer) {
                fputcsv($handle, [
                    $transfer->patient_reference_code,
                    $transfer->status,
                    $transfer->delivery_status,
                    $transfer->case_type,
                    $transfer->urgency_level,
                    $transfer->sendingHospital?->name,
                    $transfer->receivingHospital?->name,
                    $transfer->assignedDispatcher?->name,
                    optional($transfer->created_at)->toDateTimeString(),
                    optional($transfer->reserved_until)->toDateTimeString(),
                    $transfer->route_distance_km,
                    $transfer->estimated_travel_minutes,
                    $transfer->is_escalated ? 'yes' : 'no',
                ]);
            }

            fclose($handle);
        }, 'carebridge-transfer-report.csv', [
            'Content-Type' => 'text/csv',
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
            'document_checklist' => 'nullable|array',
            'document_checklist.*' => 'boolean',
            'privacy_confirmed' => 'accepted',
            'transport_team' => 'nullable|string|max:120',
            'ambulance_unit' => 'nullable|string|max:80',
            'transport_contact' => 'nullable|string|max:80',
            'estimated_arrival_at' => 'nullable|date',
            'route_distance_km' => 'nullable|numeric|min:0|max:9999',
            'estimated_travel_minutes' => 'nullable|integer|min:0|max:10080',
        ]);

        if ((int) $validated['receiving_hospital_id'] === (int) $user->hospital_id) {
            return response()->json(['message' => 'Receiving hospital must be different from your hospital.'], 422);
        }

        $transferRequest = TransferRequest::create([
            ...$validated,
            'documents_ready' => $validated['documents_ready'] ?? (!empty($validated['document_checklist'] ?? []) && collect($validated['document_checklist'])->every(fn ($ready) => (bool) $ready)),
            'document_checklist' => $validated['document_checklist'] ?? [],
            'privacy_confirmed' => true,
            'sending_hospital_id' => $user->hospital_id,
            'status' => 'pending',
            'created_by' => $user->id,
        ]);
        $this->applyRouteEstimateFromCoordinates($transferRequest);

        $transferRequest->logAction($user->id, 'created', 'Transfer request created.');

        return response()->json([
            'message' => 'Transfer request created successfully.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'assignedDispatcher'),
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
        $this->releaseExpiredReservations();

        $transferRequest = TransferRequest::with([
            'sendingHospital',
            'receivingHospital',
            'creator',
            'acceptor',
            'assignedDispatcher',
            'escalator',
            'attachments.uploader',
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
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
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
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
        ]);
    }

    public function reserve(Request $request, int $id): JsonResponse
    {
        $this->releaseExpiredReservations();

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
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
        ]);
    }

    public function startTransfer(Request $request, int $id): JsonResponse
    {
        $this->releaseExpiredReservations();

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
            'route_distance_km' => 'nullable|numeric|min:0|max:9999',
            'estimated_travel_minutes' => 'nullable|integer|min:0|max:10080',
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
            'route_distance_km' => $validated['route_distance_km'] ?? $transferRequest->route_distance_km,
            'estimated_travel_minutes' => $validated['estimated_travel_minutes'] ?? $transferRequest->estimated_travel_minutes,
        ]);

        $transferRequest->logAction($user->id, 'in_transfer', 'Patient transfer in progress.');

        return response()->json([
            'message' => 'Transfer started.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
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
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
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
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
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
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
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
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator'),
        ]);
    }

    public function updateCoordinatorNotes(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only department monitors can add coordination notes.'], 403);
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
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator'),
        ]);
    }

    public function assignDispatcher(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only department monitors can assign delivery dispatchers.'], 403);
        }

        $transferRequest = TransferRequest::findOrFail($id);
        $validated = $request->validate([
            'assigned_dispatcher_id' => 'required|exists:users,id',
        ]);

        $dispatcher = User::whereKey($validated['assigned_dispatcher_id'])
            ->where('account_status', 'approved')
            ->whereIn('role', self::MONITOR_ROLES)
            ->first();

        if (!$dispatcher) {
            return response()->json(['message' => 'Selected user must be an approved department monitor.'], 422);
        }

        $transferRequest->update([
            'assigned_dispatcher_id' => $dispatcher->id,
            'assigned_at' => now(),
        ]);

        $transferRequest->logAction($user->id, 'assigned', "Assigned to {$dispatcher->name} for placement and delivery monitoring.");

        return response()->json([
            'message' => 'Dispatcher assigned.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator'),
        ]);
    }

    public function updateRouteEstimate(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canUpdateDeliveryMonitoring($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to update this route estimate.'], 403);
        }

        $validated = $request->validate([
            'route_distance_km' => 'nullable|numeric|min:0|max:9999',
            'estimated_travel_minutes' => 'nullable|integer|min:0|max:10080',
        ]);

        $transferRequest->update($validated);
        $transferRequest->logAction($request->user()->id, 'route_updated', 'Route distance and travel estimate updated.');

        return response()->json([
            'message' => 'Route estimate updated.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator'),
        ]);
    }

    public function addDeliveryEvent(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canUpdateDeliveryMonitoring($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to update this delivery timeline.'], 403);
        }

        $validated = $request->validate([
            'event_type' => 'required|in:departed,location_update,delayed,arrived_gate,handoff_completed',
            'location' => 'nullable|string|max:120',
            'notes' => 'nullable|string|max:500',
            'occurred_at' => 'nullable|date',
        ]);

        $user = $request->user();
        $eventLabels = [
            'departed' => 'Departed',
            'location_update' => 'Location update',
            'delayed' => 'Delayed',
            'arrived_gate' => 'Arrived at receiving area',
            'handoff_completed' => 'Handoff completed',
        ];
        $events = $transferRequest->delivery_events ?? [];
        $events[] = [
            'id' => (string) Str::uuid(),
            'event_type' => $validated['event_type'],
            'label' => $eventLabels[$validated['event_type']],
            'location' => $validated['location'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'occurred_at' => $validated['occurred_at'] ?? now()->toISOString(),
            'user_id' => $user->id,
            'user_name' => $user->name,
        ];

        $updates = ['delivery_events' => $events];
        if (!empty($validated['location'])) {
            $updates['delivery_last_location'] = $validated['location'];
        }
        if (!empty($validated['notes'])) {
            $updates['delivery_notes'] = $validated['notes'];
        }

        $transferRequest->update($updates);
        $transferRequest->logAction($user->id, 'delivery_update', $eventLabels[$validated['event_type']].' added to delivery timeline.');

        return response()->json([
            'message' => 'Delivery update added.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator', 'logs.user'),
        ]);
    }

    public function uploadAttachment(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canAccessTransfer($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to upload documents for this case.'], 403);
        }

        $validated = $request->validate([
            'document_type' => 'required|in:referral_note,lab_results,imaging,consent,transport_form,supporting_document',
            'file' => 'required|file|max:5120|mimes:pdf,jpg,jpeg,png,doc,docx',
        ]);

        $file = $validated['file'];
        $path = $file->store("transfer-attachments/{$transferRequest->id}");

        $attachment = TransferAttachment::create([
            'transfer_request_id' => $transferRequest->id,
            'uploaded_by' => $request->user()->id,
            'document_type' => $validated['document_type'],
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize() ?: 0,
        ]);

        $transferRequest->logAction($request->user()->id, 'attachment_uploaded', "Uploaded {$attachment->original_name}.");

        return response()->json([
            'message' => 'Attachment uploaded.',
            'attachment' => $attachment->load('uploader'),
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator', 'attachments.uploader', 'logs.user'),
        ], 201);
    }

    public function deleteAttachment(Request $request, int $id, int $attachmentId): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canAccessTransfer($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to remove documents for this case.'], 403);
        }

        $attachment = $transferRequest->attachments()->findOrFail($attachmentId);
        $user = $request->user();

        if ($user->role !== 'admin' && (int) $attachment->uploaded_by !== (int) $user->id) {
            return response()->json(['message' => 'Only the uploader or an admin can remove this attachment.'], 403);
        }

        Storage::delete($attachment->path);
        $originalName = $attachment->original_name;
        $attachment->delete();
        $transferRequest->logAction($user->id, 'attachment_removed', "Removed {$originalName}.");

        return response()->json([
            'message' => 'Attachment removed.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator', 'attachments.uploader', 'logs.user'),
        ]);
    }

    public function downloadAttachment(Request $request, int $id, int $attachmentId): StreamedResponse|JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canAccessTransfer($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to download this attachment.'], 403);
        }

        $attachment = $transferRequest->attachments()->findOrFail($attachmentId);

        if (!Storage::exists($attachment->path)) {
            return response()->json(['message' => 'Attachment file is missing from storage.'], 404);
        }

        return Storage::download($attachment->path, $attachment->original_name);
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only department monitors can archive cases.'], 403);
        }

        $transferRequest = TransferRequest::findOrFail($id);
        $validated = $request->validate([
            'archive_reason' => 'nullable|string|max:255',
        ]);

        $transferRequest->update([
            'archived_at' => now(),
            'archived_by' => $user->id,
            'archive_reason' => $validated['archive_reason'] ?? 'Archived from department workflow.',
        ]);

        $transferRequest->logAction($user->id, 'archived', $transferRequest->archive_reason);

        return response()->json([
            'message' => 'Case archived.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator'),
        ]);
    }

    public function unarchive(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only department monitors can restore archived cases.'], 403);
        }

        $transferRequest = TransferRequest::findOrFail($id);
        $transferRequest->update([
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
        ]);

        $transferRequest->logAction($user->id, 'unarchived', 'Case restored to active workflow.');

        return response()->json([
            'message' => 'Case restored.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator'),
        ]);
    }

    public function board(Request $request): JsonResponse
    {
        $this->releaseExpiredReservations();

        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only department monitors can view the command board.'], 403);
        }

        $hospitalId = $user->hospital_id;
        $statuses = ['pending', 'accepted', 'reserved', 'in_transfer', 'completed', 'declined'];
        $requests = TransferRequest::with(['sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator'])
            ->whereIn('status', $statuses)
            ->whereNull('archived_at')
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
            'dispatchers' => User::whereIn('role', self::MONITOR_ROLES)
                ->where('account_status', 'approved')
                ->orderBy('role')
                ->orderBy('name')
                ->get(['id', 'name', 'role']),
        ]);
    }

    public function wallboard(Request $request): JsonResponse
    {
        $this->releaseExpiredReservations();

        $user = $request->user();

        if (!in_array($user->role, self::MONITOR_ROLES)) {
            return response()->json(['message' => 'Only department monitors can view the wallboard.'], 403);
        }

        $active = TransferRequest::with(['sendingHospital', 'receivingHospital', 'assignedDispatcher'])
            ->whereNull('archived_at')
            ->whereIn('status', ['pending', 'accepted', 'reserved', 'in_transfer'])
            ->orderByRaw("CASE urgency_level WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END")
            ->latest()
            ->take(40)
            ->get();

        return response()->json([
            'metrics' => [
                'active_cases' => $active->count(),
                'needs_attention' => $active->where('needs_attention', true)->count(),
                'unassigned' => $active->whereNull('assigned_dispatcher_id')->count(),
                'in_delivery' => $active->where('status', 'in_transfer')->count(),
            ],
            'cases' => $active->values(),
        ]);
    }

    private function canAccessTransfer(Request $request, TransferRequest $transferRequest): bool
    {
        $user = $request->user();

        return in_array($user->role, self::MONITOR_ROLES)
            || (int) $transferRequest->sending_hospital_id === (int) $user->hospital_id
            || (int) $transferRequest->receiving_hospital_id === (int) $user->hospital_id;
    }

    private function canUpdateDeliveryMonitoring(Request $request, TransferRequest $transferRequest): bool
    {
        $user = $request->user();

        if (in_array($user->role, ['coordinator', 'admin'])) {
            return true;
        }

        if ($user->role === 'dispatcher') {
            return !$transferRequest->assigned_dispatcher_id
                || (int) $transferRequest->assigned_dispatcher_id === (int) $user->id;
        }

        return (int) $transferRequest->sending_hospital_id === (int) $user->hospital_id
            || (int) $transferRequest->receiving_hospital_id === (int) $user->hospital_id;
    }

    private function visibleTransferQuery(Request $request)
    {
        $user = $request->user();
        $hospitalId = $user->hospital_id;

        return TransferRequest::with(['sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator', 'logs.user'])
            ->when(!in_array($user->role, self::MONITOR_ROLES), function ($q) use ($hospitalId) {
                $q->where(function ($scoped) use ($hospitalId) {
                    $scoped->where('sending_hospital_id', $hospitalId)
                        ->orWhere('receiving_hospital_id', $hospitalId);
                });
            });
    }

    private function releaseExpiredReservations(): void
    {
        TransferRequest::where('status', 'reserved')
            ->whereNotNull('reserved_until')
            ->where('reserved_until', '<', now())
            ->chunkById(50, function ($transfers) {
                foreach ($transfers as $transfer) {
                    $this->releaseExpiredReservation($transfer);
                }
            });
    }

    private function releaseExpiredReservation(TransferRequest $transferRequest): void
    {
        if ($transferRequest->status !== 'reserved' || !$transferRequest->reserved_until || now()->lessThanOrEqualTo($transferRequest->reserved_until)) {
            return;
        }

        DB::transaction(function () use ($transferRequest) {
            $freshTransfer = TransferRequest::whereKey($transferRequest->id)->lockForUpdate()->first();

            if (!$freshTransfer || $freshTransfer->status !== 'reserved' || now()->lessThanOrEqualTo($freshTransfer->reserved_until)) {
                return;
            }

            $bedColumn = $this->bedColumnForCaseType($freshTransfer->case_type);
            $capacity = HospitalCapacity::where('hospital_id', $freshTransfer->receiving_hospital_id)
                ->latest()
                ->lockForUpdate()
                ->first();

            if ($capacity) {
                $capacity->update([
                    $bedColumn => $capacity->{$bedColumn} + 1,
                    'last_updated' => now(),
                ]);
            }

            $freshTransfer->update([
                'status' => 'accepted',
                'reserved_until' => null,
            ]);

            $freshTransfer->logAction($freshTransfer->created_by, 'reservation_expired', 'Reservation expired and matching capacity was released.');
        });
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

    private function applyRouteEstimateFromCoordinates(TransferRequest $transferRequest): void
    {
        $transferRequest->loadMissing('sendingHospital', 'receivingHospital');
        $sending = $transferRequest->sendingHospital;
        $receiving = $transferRequest->receivingHospital;

        if (!$sending?->latitude || !$sending?->longitude || !$receiving?->latitude || !$receiving?->longitude) {
            return;
        }

        if ($transferRequest->route_distance_km && $transferRequest->estimated_travel_minutes) {
            return;
        }

        $distance = $this->distanceKm((float) $sending->latitude, (float) $sending->longitude, (float) $receiving->latitude, (float) $receiving->longitude);
        $roadDistance = round($distance * 1.25, 2);

        $transferRequest->update([
            'route_distance_km' => $transferRequest->route_distance_km ?? $roadDistance,
            'estimated_travel_minutes' => $transferRequest->estimated_travel_minutes ?? max(5, (int) ceil(($roadDistance / 35) * 60)),
        ]);
    }

    private function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadiusKm = 6371;
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lonDelta / 2) ** 2;

        return $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
