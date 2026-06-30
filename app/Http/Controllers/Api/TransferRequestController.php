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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class TransferRequestController extends Controller
{
    private const MONITOR_ROLES = ['coordinator', 'dispatcher', 'admin'];
    private const OVERSIGHT_ROLES = ['coordinator', 'admin'];

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
                'Rejected From',
                'Accepting Hospital',
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
        }, 'carebridge-placement-report.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'sending_staff') {
            return response()->json(['message' => 'Only intake staff can create rejected patient placement cases.'], 403);
        }

        if (!$user->hospital_id) {
            return response()->json(['message' => 'Your account is not assigned to a placement origin.'], 422);
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
            return response()->json(['message' => 'Accepting hospital must be different from the rejected patient origin.'], 422);
        }

        if ($field = $this->firstPrivacyRiskField($validated)) {
            return response()->json([
                'message' => "Remove personal patient information from {$field}. Use the patient reference code instead.",
            ], 422);
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

        $transferRequest->logAction($user->id, 'created', 'Rejected patient placement case created.');

        return response()->json([
            'message' => 'Rejected patient placement case created successfully.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'assignedDispatcher'),
        ], 201);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'sending_staff') {
            return response()->json(['message' => 'Only intake staff can view accepting hospital recommendations.'], 403);
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
            ->map(function (Hospital $hospital) use ($bedColumn, $caseType, $user) {
                $capacity = $hospital->latestCapacity;
                $matchingBeds = $capacity?->{$bedColumn} ?? 0;
                $totalBeds = $capacity
                    ? $capacity->general_beds_available + $capacity->emergency_beds_available + $capacity->icu_beds_available
                    : 0;
                $origin = $user->hospital;
                $distance = ($origin?->latitude && $origin?->longitude && $hospital->latitude && $hospital->longitude)
                    ? round($this->distanceKm((float) $origin->latitude, (float) $origin->longitude, (float) $hospital->latitude, (float) $hospital->longitude) * 1.25, 2)
                    : null;
                $ambulanceAvailable = $capacity?->ambulance_available ?? 0;
                $reasons = [
                    $matchingBeds > 0
                        ? "{$matchingBeds} ".strtoupper($caseType).' bed'.($matchingBeds === 1 ? '' : 's').' available'
                        : 'No matching bed currently open',
                    $totalBeds > 0 ? "{$totalBeds} total beds open" : 'No open beds reported',
                    $ambulanceAvailable > 0 ? "{$ambulanceAvailable} ambulance".($ambulanceAvailable === 1 ? '' : 's').' available' : 'No ambulance reported',
                ];

                if ($distance !== null) {
                    $reasons[] = "{$distance} km estimated route";
                }

                return [
                    'id' => $hospital->id,
                    'name' => $hospital->name,
                    'address' => $hospital->address,
                    'contact_number' => $hospital->contact_number,
                    'status' => $hospital->status,
                    'latest_capacity' => $capacity,
                    'matching_beds' => $matchingBeds,
                    'total_beds' => $totalBeds,
                    'ambulance_available' => $ambulanceAvailable,
                    'distance_km' => $distance,
                    'estimated_travel_minutes' => $distance ? max(5, (int) ceil(($distance / 35) * 60)) : null,
                    'match_status' => $matchingBeds > 0 ? 'Can accept matching need' : 'No matching bed now',
                    'recommendation_reasons' => $reasons,
                    'recommendation_score' => ($matchingBeds * 10) + $totalBeds + (($capacity?->ambulance_available ?? 0) * 2) - ($distance ? min(12, $distance / 4) : 0),
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
            return response()->json(['message' => 'You are not allowed to view this placement case.'], 403);
        }

        return response()->json([
            'transfer_request' => $transferRequest,
        ]);
    }

    public function routeSuggestion(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::with(['sendingHospital', 'receivingHospital'])->findOrFail($id);

        if (!$this->canAccessTransfer($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to view this placement route.'], 403);
        }

        $sending = $transferRequest->sendingHospital;
        $receiving = $transferRequest->receivingHospital;

        if (!$sending?->latitude || !$sending?->longitude || !$receiving?->latitude || !$receiving?->longitude) {
            return response()->json([
                'message' => 'Both hospitals need coordinates before a route can be calculated.',
                'source' => 'unavailable',
            ], 422);
        }

        $googleRoute = $this->googleRouteEstimate($sending, $receiving);

        if ($googleRoute) {
            return response()->json([
                ...$googleRoute,
                'message' => 'Route calculated from Google Maps routing API.',
            ]);
        }

        $geoRoute = $this->geoApiRouteEstimate($sending, $receiving);

        if ($geoRoute) {
            return response()->json([
                ...$geoRoute,
                'message' => 'Route calculated from Geoapify geo API.',
            ]);
        }

        $roadRoute = $this->roadRouteEstimate($sending, $receiving);

        if ($roadRoute) {
            return response()->json([
                ...$roadRoute,
                'message' => 'Road route calculated from routing service.',
            ]);
        }

        return response()->json([
            ...$this->fallbackRouteEstimate($sending, $receiving),
            'message' => 'Routing service is unavailable. Showing coordinate-based estimate.',
        ]);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the accepting hospital can accept this placement case.'], 403);
        }

        if ($transferRequest->status !== 'pending') {
            return response()->json(['message' => 'Only searching placement cases can be accepted.'], 422);
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
            ?? 'Placement case accepted by accepting hospital.';
        $transferRequest->logAction($user->id, 'accepted', $remarks);

        return response()->json([
            'message' => 'Placement case accepted.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
        ]);
    }

    public function decline(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the accepting hospital can decline this placement case.'], 403);
        }

        if ($transferRequest->status !== 'pending') {
            return response()->json(['message' => 'Only searching placement cases can be declined.'], 422);
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
            'message' => 'Placement case declined.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
        ]);
    }

    public function reserve(Request $request, int $id): JsonResponse
    {
        $this->releaseExpiredReservations();

        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the accepting hospital can reserve capacity for this placement case.'], 403);
        }

        if ($transferRequest->status !== 'accepted') {
            return response()->json(['message' => 'Only accepted placement cases can reserve capacity.'], 422);
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

            $transferRequest->logAction($user->id, 'reserved', "Capacity slot reserved at accepting hospital for {$reservationMinutes} minutes.");

            return $transferRequest;
        });

        if (!$reservedTransfer) {
            return response()->json(['message' => 'No matching bed capacity is available at the accepting hospital.'], 422);
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
            return response()->json(['message' => 'Only intake staff from the rejected patient origin can start delivery.'], 403);
        }

        if ($transferRequest->status !== 'reserved') {
            return response()->json(['message' => 'Only reserved placement cases can start delivery.'], 422);
        }

        if ($transferRequest->reserved_until && now()->greaterThan($transferRequest->reserved_until)) {
            return response()->json(['message' => 'The reservation timer has expired. Ask the accepting hospital to reserve again.'], 422);
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
            'delivery_last_location' => $validated['delivery_last_location'] ?? 'Departed from rejected patient origin',
            'delivery_notes' => $validated['delivery_notes'] ?? $transferRequest->delivery_notes,
            'transport_team' => $validated['transport_team'] ?? $transferRequest->transport_team,
            'ambulance_unit' => $validated['ambulance_unit'] ?? $transferRequest->ambulance_unit,
            'transport_contact' => $validated['transport_contact'] ?? $transferRequest->transport_contact,
            'estimated_arrival_at' => $validated['estimated_arrival_at'] ?? $transferRequest->estimated_arrival_at,
            'route_distance_km' => $validated['route_distance_km'] ?? $transferRequest->route_distance_km,
            'estimated_travel_minutes' => $validated['estimated_travel_minutes'] ?? $transferRequest->estimated_travel_minutes,
        ]);

        $transferRequest->logAction($user->id, 'in_transfer', 'Patient delivery is in progress.');

        return response()->json([
            'message' => 'Patient delivery started.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
        ]);
    }

    public function markArrived(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the accepting hospital can mark patient arrival.'], 403);
        }

        if ($transferRequest->status !== 'in_transfer') {
            return response()->json(['message' => 'Only active delivery cases can be marked as arrived.'], 422);
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
            'delivery_last_location' => $validated['delivery_last_location'] ?? 'Arrived at accepting hospital',
            'delivery_notes' => $validated['delivery_notes'] ?? $transferRequest->delivery_notes,
            'handoff_notes' => $validated['handoff_notes'] ?? $transferRequest->handoff_notes,
        ]);

        $transferRequest->logAction($user->id, 'patient_arrived', 'Patient arrived at accepting hospital.');

        return response()->json([
            'message' => 'Patient arrival recorded.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
        ]);
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canActAsReceivingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only the accepting hospital can complete this delivery.'], 403);
        }

        if ($transferRequest->status !== 'in_transfer') {
            return response()->json(['message' => 'Only active delivery cases can be completed.'], 422);
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
            'delivery_last_location' => 'Delivered to accepting hospital care team',
            'delivery_notes' => $validated['delivery_notes'] ?? $transferRequest->delivery_notes,
            'handoff_notes' => $validated['handoff_notes'] ?? $transferRequest->handoff_notes,
        ]);

        $transferRequest->logAction($user->id, 'completed', 'Patient placement and delivery completed successfully.');

        return response()->json([
            'message' => 'Delivery completed.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
        ]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $transferRequest = TransferRequest::findOrFail($id);

        if (!$this->canAccessTransfer($request, $transferRequest)) {
            return response()->json(['message' => 'You are not allowed to cancel this placement case.'], 403);
        }

        if (!$this->canActAsSendingHospital($request, $transferRequest)) {
            return response()->json(['message' => 'Only intake staff from the rejected patient origin can cancel this placement case.'], 403);
        }

        if (!in_array($transferRequest->status, ['pending', 'accepted', 'reserved'])) {
            return response()->json(['message' => 'This placement case cannot be cancelled in its current status.'], 422);
        }

        $user = $request->user();
        $remarks = $request->input('remarks', 'Placement case cancelled.');

        $transferRequest->update([
            'status' => 'cancelled',
        ]);

        $transferRequest->logAction($user->id, 'cancelled', $remarks);

        return response()->json([
            'message' => 'Placement case cancelled.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher'),
        ]);
    }

    public function escalate(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::OVERSIGHT_ROLES)) {
            return response()->json(['message' => 'Only coordinators and admins can escalate placement cases.'], 403);
        }

        $transferRequest = TransferRequest::findOrFail($id);

        if (!in_array($transferRequest->status, ['pending', 'accepted', 'reserved', 'in_transfer'])) {
            return response()->json(['message' => 'Only active placement cases can be escalated.'], 422);
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
            'message' => 'Placement case escalated.',
            'transfer_request' => $transferRequest->load('sendingHospital', 'receivingHospital', 'creator', 'acceptor', 'assignedDispatcher', 'escalator'),
        ]);
    }

    public function updateCoordinatorNotes(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!in_array($user->role, self::OVERSIGHT_ROLES)) {
            return response()->json(['message' => 'Only coordinators and admins can add coordination notes.'], 403);
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

        if (!in_array($user->role, ['coordinator', 'dispatcher', 'admin'])) {
            return response()->json(['message' => 'Only department monitors can assign delivery dispatchers.'], 403);
        }

        $transferRequest = TransferRequest::findOrFail($id);
        $validated = $request->validate([
            'assigned_dispatcher_id' => 'required|exists:users,id',
        ]);

        $dispatcher = User::whereKey($validated['assigned_dispatcher_id'])
            ->where('account_status', 'approved')
            ->where('role', 'dispatcher')
            ->first();

        if (!$dispatcher) {
            return response()->json(['message' => 'Selected user must be an approved dispatcher.'], 422);
        }

        if ($user->role === 'dispatcher') {
            if ((int) $dispatcher->id !== (int) $user->id) {
                return response()->json(['message' => 'Dispatchers can only claim cases for themselves.'], 403);
            }

            if ($transferRequest->assigned_dispatcher_id && (int) $transferRequest->assigned_dispatcher_id !== (int) $user->id) {
                return response()->json(['message' => 'This case is already assigned to another dispatcher.'], 422);
            }
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
            'transport_team' => 'nullable|string|max:120',
            'ambulance_unit' => 'nullable|string|max:80',
            'transport_contact' => 'nullable|string|max:80',
            'estimated_arrival_at' => 'nullable|date',
            'delivery_last_location' => 'nullable|string|max:120',
            'override_reason' => 'nullable|string|max:500',
        ]);

        if ($reasonError = $this->monitorOverrideReasonError($request, $validated['override_reason'] ?? null)) {
            return $reasonError;
        }

        $updates = [];
        foreach (['route_distance_km', 'estimated_travel_minutes', 'transport_team', 'ambulance_unit', 'transport_contact', 'estimated_arrival_at', 'delivery_last_location'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updates[$field] = $validated[$field];
            }
        }

        $transferRequest->update($updates);
        $remarks = 'Delivery route and transport details updated.';
        if (!empty($validated['override_reason'])) {
            $remarks .= ' Override reason: '.$validated['override_reason'];
        }
        $transferRequest->logAction($request->user()->id, 'route_updated', $remarks);

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
            'override_reason' => 'nullable|string|max:500',
        ]);

        if ($reasonError = $this->monitorOverrideReasonError($request, $validated['override_reason'] ?? null)) {
            return $reasonError;
        }

        $user = $request->user();
        $eventLabels = [
            'departed' => 'Departed',
            'location_update' => 'Location update',
            'delayed' => 'Delayed',
            'arrived_gate' => 'Arrived at accepting area',
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
        $remarks = $eventLabels[$validated['event_type']].' added to delivery timeline.';
        if (!empty($validated['override_reason'])) {
            $remarks .= ' Override reason: '.$validated['override_reason'];
        }
        $transferRequest->logAction($user->id, $validated['event_type'], $remarks);

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

        if (!in_array($user->role, self::OVERSIGHT_ROLES)) {
            return response()->json(['message' => 'Only coordinators and admins can archive cases.'], 403);
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

        if (!in_array($user->role, self::OVERSIGHT_ROLES)) {
            return response()->json(['message' => 'Only coordinators and admins can restore archived cases.'], 403);
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
            'dispatchers' => User::where('role', 'dispatcher')
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

        return false;
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

    private function roadRouteEstimate(Hospital $sending, Hospital $receiving): ?array
    {
        $baseUrl = rtrim((string) config('services.routing.osrm_url', 'https://router.project-osrm.org'), '/');
        $timeout = (int) config('services.routing.timeout', 4);

        if ($baseUrl === '') {
            return null;
        }

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->get($baseUrl.'/route/v1/driving/'
                    .$sending->longitude.','.$sending->latitude.';'
                    .$receiving->longitude.','.$receiving->latitude, [
                        'overview' => 'full',
                        'geometries' => 'geojson',
                        'alternatives' => 'false',
                        'steps' => 'false',
                    ]);

            if (!$response->successful()) {
                return null;
            }

            $route = $response->json('routes.0');

            if (!$route || !isset($route['distance'], $route['duration'])) {
                return null;
            }

            $coordinates = collect($route['geometry']['coordinates'] ?? [])
                ->filter(fn ($point) => is_array($point) && count($point) >= 2)
                ->map(fn ($point) => [
                    'lat' => round((float) $point[1], 7),
                    'lng' => round((float) $point[0], 7),
                ])
                ->values()
                ->all();

            if (count($coordinates) < 2) {
                return null;
            }

            return [
                'source' => 'road',
                'provider' => 'OSRM',
                'distance_km' => round(((float) $route['distance']) / 1000, 2),
                'estimated_travel_minutes' => max(1, (int) ceil(((float) $route['duration']) / 60)),
                'geometry' => $this->thinRouteGeometry($coordinates),
            ];
        } catch (Throwable) {
            return null;
        }
    }

    private function googleRouteEstimate(Hospital $sending, Hospital $receiving): ?array
    {
        $apiKey = (string) config('services.routing.google_key', '');
        $baseUrl = rtrim((string) config('services.routing.google_directions_url', 'https://maps.googleapis.com/maps/api/directions/json'), '/');
        $timeout = (int) config('services.routing.timeout', 4);

        if ($apiKey === '' || $baseUrl === '') {
            return null;
        }

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->get($baseUrl, [
                    'origin' => $sending->latitude.','.$sending->longitude,
                    'destination' => $receiving->latitude.','.$receiving->longitude,
                    'mode' => 'driving',
                    'key' => $apiKey,
                ]);

            if (!$response->successful() || $response->json('status') !== 'OK') {
                return null;
            }

            $route = $response->json('routes.0');
            $leg = $route['legs'][0] ?? null;

            if (!$route || !$leg || !isset($leg['distance']['value'], $leg['duration']['value'])) {
                return null;
            }

            $coordinates = $this->decodeGooglePolyline($route['overview_polyline']['points'] ?? '');

            if (count($coordinates) < 2) {
                return null;
            }

            return [
                'source' => 'google',
                'provider' => 'Google Maps',
                'distance_km' => round(((float) $leg['distance']['value']) / 1000, 2),
                'estimated_travel_minutes' => max(1, (int) ceil(((float) $leg['duration']['value']) / 60)),
                'geometry' => $this->thinRouteGeometry($coordinates),
            ];
        } catch (Throwable) {
            return null;
        }
    }

    private function geoApiRouteEstimate(Hospital $sending, Hospital $receiving): ?array
    {
        $apiKey = (string) config('services.routing.geoapify_key', '');
        $baseUrl = rtrim((string) config('services.routing.geoapify_url', 'https://api.geoapify.com'), '/');
        $timeout = (int) config('services.routing.timeout', 4);

        if ($apiKey === '' || $baseUrl === '') {
            return null;
        }

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->get($baseUrl.'/v1/routing', [
                    'waypoints' => $sending->latitude.','.$sending->longitude.'|'.$receiving->latitude.','.$receiving->longitude,
                    'mode' => 'drive',
                    'details' => 'instruction_details',
                    'apiKey' => $apiKey,
                ]);

            if (!$response->successful()) {
                return null;
            }

            $feature = $response->json('features.0');
            $properties = $feature['properties'] ?? [];
            $coordinates = $this->geoJsonCoordinatesToPoints($feature['geometry']['coordinates'] ?? []);

            if (count($coordinates) < 2 || !isset($properties['distance'], $properties['time'])) {
                return null;
            }

            return [
                'source' => 'geo',
                'provider' => 'Geoapify',
                'distance_km' => round(((float) $properties['distance']) / 1000, 2),
                'estimated_travel_minutes' => max(1, (int) ceil(((float) $properties['time']) / 60)),
                'geometry' => $this->thinRouteGeometry($coordinates),
            ];
        } catch (Throwable) {
            return null;
        }
    }

    private function fallbackRouteEstimate(Hospital $sending, Hospital $receiving): array
    {
        $distance = $this->distanceKm((float) $sending->latitude, (float) $sending->longitude, (float) $receiving->latitude, (float) $receiving->longitude);
        $geometry = $this->fallbackRouteGeometry($sending, $receiving);
        $routeDistance = $this->routePolylineDistance($geometry);
        $roadDistance = round(max($distance * 1.18, $routeDistance), 2);

        return [
            'source' => 'estimated',
            'provider' => 'Local route estimate',
            'distance_km' => $roadDistance,
            'estimated_travel_minutes' => max(5, (int) ceil(($roadDistance / 35) * 60)),
            'geometry' => $geometry,
        ];
    }

    private function fallbackRouteGeometry(Hospital $sending, Hospital $receiving): array
    {
        $start = ['lat' => (float) $sending->latitude, 'lng' => (float) $sending->longitude];
        $end = ['lat' => (float) $receiving->latitude, 'lng' => (float) $receiving->longitude];

        if ($this->looksLikeMalaybalayValenciaRoute($start, $end)) {
            $corridor = [
                ['lat' => 8.1506, 'lng' => 125.1244],
                ['lat' => 8.1138, 'lng' => 125.1198],
                ['lat' => 8.0675, 'lng' => 125.1153],
                ['lat' => 8.0218, 'lng' => 125.1115],
                ['lat' => 7.9780, 'lng' => 125.1059],
                ['lat' => 7.9365, 'lng' => 125.0996],
                ['lat' => 7.9076, 'lng' => 125.0948],
            ];
            $points = $start['lat'] > $end['lat'] ? $corridor : array_reverse($corridor);
            $points[0] = $start;
            $points[count($points) - 1] = $end;

            return $points;
        }

        $latDelta = $end['lat'] - $start['lat'];
        $lngDelta = $end['lng'] - $start['lng'];

        return [
            $start,
            [
                'lat' => $start['lat'] + ($latDelta * 0.35),
                'lng' => $start['lng'] + ($lngDelta * 0.35) + ($lngDelta === 0.0 ? 0.004 : $lngDelta * 0.12),
            ],
            [
                'lat' => $start['lat'] + ($latDelta * 0.7),
                'lng' => $start['lng'] + ($lngDelta * 0.7) - ($lngDelta === 0.0 ? 0.004 : $lngDelta * 0.08),
            ],
            $end,
        ];
    }

    private function looksLikeMalaybalayValenciaRoute(array $start, array $end): bool
    {
        $north = max($start['lat'], $end['lat']);
        $south = min($start['lat'], $end['lat']);
        $west = min($start['lng'], $end['lng']);
        $east = max($start['lng'], $end['lng']);

        return $north >= 8.1
            && $south <= 7.95
            && $west >= 125.08
            && $east <= 125.14;
    }

    private function routePolylineDistance(array $points): float
    {
        $distance = 0.0;

        for ($index = 1, $count = count($points); $index < $count; $index += 1) {
            $previous = $points[$index - 1];
            $current = $points[$index];
            $distance += $this->distanceKm($previous['lat'], $previous['lng'], $current['lat'], $current['lng']);
        }

        return $distance;
    }

    private function geoJsonCoordinatesToPoints(array $coordinates): array
    {
        $points = [];

        $walk = function (array $items) use (&$walk, &$points): void {
            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }

                if (isset($item[0], $item[1]) && is_numeric($item[0]) && is_numeric($item[1])) {
                    $points[] = [
                        'lat' => round((float) $item[1], 7),
                        'lng' => round((float) $item[0], 7),
                    ];

                    continue;
                }

                $walk($item);
            }
        };

        $walk($coordinates);

        return $points;
    }

    private function thinRouteGeometry(array $coordinates, int $limit = 120): array
    {
        $count = count($coordinates);

        if ($count <= $limit) {
            return $coordinates;
        }

        $step = (int) ceil($count / $limit);
        $thinned = [];

        foreach ($coordinates as $index => $coordinate) {
            if ($index % $step === 0) {
                $thinned[] = $coordinate;
            }
        }

        $last = $coordinates[$count - 1];

        if (end($thinned) !== $last) {
            $thinned[] = $last;
        }

        return $thinned;
    }

    private function decodeGooglePolyline(string $encoded): array
    {
        $points = [];
        $index = 0;
        $lat = 0;
        $lng = 0;
        $length = strlen($encoded);

        while ($index < $length) {
            $result = 0;
            $shift = 0;

            do {
                $byte = ord($encoded[$index++]) - 63;
                $result |= ($byte & 0x1f) << $shift;
                $shift += 5;
            } while ($byte >= 0x20 && $index < $length);

            $lat += ($result & 1) ? ~($result >> 1) : ($result >> 1);
            $result = 0;
            $shift = 0;

            do {
                $byte = ord($encoded[$index++]) - 63;
                $result |= ($byte & 0x1f) << $shift;
                $shift += 5;
            } while ($byte >= 0x20 && $index < $length);

            $lng += ($result & 1) ? ~($result >> 1) : ($result >> 1);

            $points[] = [
                'lat' => round($lat / 100000, 7),
                'lng' => round($lng / 100000, 7),
            ];
        }

        return $points;
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

    private function firstPrivacyRiskField(array $payload): ?string
    {
        foreach (['patient_reference_code', 'notes', 'rejection_reason', 'placement_need', 'delivery_notes'] as $field) {
            if (!isset($payload[$field]) || !is_string($payload[$field])) {
                continue;
            }

            if ($this->containsPatientPrivacyRisk($payload[$field])) {
                return str_replace('_', ' ', $field);
            }
        }

        return null;
    }

    private function monitorOverrideReasonError(Request $request, ?string $reason): ?JsonResponse
    {
        if (!in_array($request->user()->role, ['coordinator', 'admin'])) {
            return null;
        }

        if (filled($reason)) {
            return null;
        }

        return response()->json([
            'message' => 'Coordinator/admin overrides require a reason for the audit trail.',
        ], 422);
    }

    private function containsPatientPrivacyRisk(string $value): bool
    {
        $normalized = trim($value);

        if ($normalized === '') {
            return false;
        }

        return (bool) preg_match('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', $normalized)
            || (bool) preg_match('/(?:\+?63|0)\s?9\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/', $normalized)
            || (bool) preg_match('/\b(patient|pt|name)\s*[:=]\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/i', $normalized);
    }
}
