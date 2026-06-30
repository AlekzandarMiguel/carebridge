<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransferRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'sending_hospital_id',
        'receiving_hospital_id',
        'patient_reference_code',
        'case_type',
        'urgency_level',
        'notes',
        'rejection_reason',
        'placement_need',
        'documents_ready',
        'document_checklist',
        'privacy_confirmed',
        'status',
        'delivery_status',
        'delivery_started_at',
        'patient_arrived_at',
        'delivery_completed_at',
        'delivery_last_location',
        'delivery_notes',
        'transport_team',
        'ambulance_unit',
        'transport_contact',
        'estimated_arrival_at',
        'decline_reason_category',
        'is_escalated',
        'escalated_by',
        'escalated_at',
        'escalation_reason',
        'created_by',
        'accepted_by',
        'assigned_dispatcher_id',
        'assigned_at',
        'accept_conditions',
        'reserved_until',
        'handoff_notes',
        'coordinator_notes',
        'archived_at',
        'archived_by',
        'archive_reason',
        'route_distance_km',
        'estimated_travel_minutes',
        'delivery_events',
    ];

    protected $casts = [
        'delivery_started_at' => 'datetime',
        'patient_arrived_at' => 'datetime',
        'delivery_completed_at' => 'datetime',
        'estimated_arrival_at' => 'datetime',
        'is_escalated' => 'boolean',
        'escalated_at' => 'datetime',
        'documents_ready' => 'boolean',
        'document_checklist' => 'array',
        'privacy_confirmed' => 'boolean',
        'reserved_until' => 'datetime',
        'assigned_at' => 'datetime',
        'archived_at' => 'datetime',
        'route_distance_km' => 'decimal:2',
        'delivery_events' => 'array',
    ];

    protected $appends = [
        'waiting_minutes',
        'sla_state',
        'delivery_eta_state',
        'needs_attention',
        'route_map_url',
        'priority_score',
        'priority_label',
        'unified_timeline',
    ];

    public function sendingHospital()
    {
        return $this->belongsTo(Hospital::class, 'sending_hospital_id');
    }

    public function receivingHospital()
    {
        return $this->belongsTo(Hospital::class, 'receiving_hospital_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function acceptor()
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    public function escalator()
    {
        return $this->belongsTo(User::class, 'escalated_by');
    }

    public function assignedDispatcher()
    {
        return $this->belongsTo(User::class, 'assigned_dispatcher_id');
    }

    public function archiver()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function logs()
    {
        return $this->hasMany(TransferLog::class, 'transfer_request_id');
    }

    public function attachments()
    {
        return $this->hasMany(TransferAttachment::class, 'transfer_request_id');
    }

    public function logAction($userId, $action, $remarks = null)
    {
        return $this->logs()->create([
            'user_id' => $userId,
            'action' => $action,
            'remarks' => $remarks,
        ]);
    }

    public function getWaitingMinutesAttribute(): int
    {
        return max(0, (int) $this->created_at?->diffInMinutes(now()));
    }

    public function getSlaStateAttribute(): string
    {
        if (!in_array($this->status, ['pending', 'accepted'])) {
            return 'clear';
        }

        $slaMinutes = (int) (SystemSetting::where('key', 'sla_pending_minutes')->value('value') ?? 20);
        $waitingMinutes = $this->waiting_minutes;

        if ($waitingMinutes >= $slaMinutes) {
            return 'breached';
        }

        return $waitingMinutes >= max(1, (int) floor($slaMinutes * 0.75)) ? 'warning' : 'clear';
    }

    public function getDeliveryEtaStateAttribute(): string
    {
        if (!$this->estimated_arrival_at || !in_array($this->delivery_status, ['en_route', 'arrived'])) {
            return 'clear';
        }

        if ($this->delivery_status === 'arrived' || $this->delivery_status === 'delivered') {
            return 'clear';
        }

        return now()->greaterThan($this->estimated_arrival_at) ? 'late' : 'on_track';
    }

    public function getNeedsAttentionAttribute(): bool
    {
        return $this->is_escalated
            || in_array($this->sla_state, ['warning', 'breached'])
            || $this->delivery_eta_state === 'late';
    }

    public function getPriorityScoreAttribute(): int
    {
        $score = match ($this->urgency_level) {
            'critical' => 50,
            'urgent' => 32,
            default => 15,
        };

        $score += min(30, (int) floor($this->waiting_minutes / 5));

        if (in_array($this->status, ['declined', 'pending'])) {
            $score += 12;
        }

        if ($this->is_escalated || $this->sla_state === 'breached' || $this->delivery_eta_state === 'late') {
            $score += 18;
        }

        if (!$this->assigned_dispatcher_id && in_array($this->status, ['accepted', 'reserved', 'in_transfer'])) {
            $score += 10;
        }

        if ($this->case_type === 'icu') {
            $score += 8;
        } elseif ($this->case_type === 'emergency') {
            $score += 5;
        }

        return min(100, $score);
    }

    public function getPriorityLabelAttribute(): string
    {
        return match (true) {
            $this->priority_score >= 80 => 'Critical',
            $this->priority_score >= 55 => 'High',
            $this->priority_score >= 32 => 'Watch',
            default => 'Normal',
        };
    }

    public function getRouteMapUrlAttribute(): ?string
    {
        if (!$this->relationLoaded('sendingHospital') || !$this->relationLoaded('receivingHospital')) {
            return null;
        }

        $origin = $this->sendingHospital?->address ?: $this->sendingHospital?->name;
        $destination = $this->receivingHospital?->address ?: $this->receivingHospital?->name;

        if (!$origin || !$destination) {
            return null;
        }

        return 'https://www.google.com/maps/dir/?api=1&origin='
            .rawurlencode($origin)
            .'&destination='
            .rawurlencode($destination)
            .'&travelmode=driving';
    }

    public function getUnifiedTimelineAttribute(): array
    {
        $items = [
            $this->timelineItem('rejected', 'Rejected case created', $this->created_at, 'The placement department received the rejected patient case.'),
            $this->timelineItem('searching', 'Searching for acceptance', $this->created_at, 'Accepting hospital search started.'),
            $this->timelineItem(
                'accepted',
                'Accepted',
                $this->statusInOrPast(['accepted', 'reserved', 'in_transfer', 'completed']) ? ($this->logs->firstWhere('action', 'accepted')?->created_at ?? $this->updated_at) : null,
                $this->statusInOrPast(['accepted', 'reserved', 'in_transfer', 'completed']) ? 'Accepting hospital approved the case.' : null,
            ),
            $this->timelineItem('reserved', 'Capacity reserved', $this->logs->firstWhere('action', 'reserved')?->created_at, $this->statusInOrPast(['reserved', 'in_transfer', 'completed']) ? 'Matching capacity was reserved.' : null),
            $this->timelineItem('dispatcher_assigned', 'Dispatcher assigned', $this->assigned_at, $this->assignedDispatcher?->name ? "Assigned to {$this->assignedDispatcher->name}." : null),
            $this->timelineItem('pickup', 'Pickup started', $this->delivery_started_at, $this->delivery_started_at ? 'Patient delivery started from origin.' : null),
            $this->timelineItem('en_route', 'En route', $this->delivery_started_at, $this->delivery_status === 'en_route' ? 'Patient is currently in delivery.' : null),
            $this->timelineItem('arrived', 'Arrived', $this->patient_arrived_at, $this->patient_arrived_at ? 'Patient arrived at accepting hospital.' : null),
            $this->timelineItem('completed', 'Handoff complete', $this->delivery_completed_at, $this->delivery_completed_at ? 'Placement and delivery handoff completed.' : null),
        ];

        foreach (($this->delivery_events ?? []) as $event) {
            $items[] = [
                'key' => $event['event_type'] ?? 'delivery_update',
                'label' => $event['label'] ?? str_replace('_', ' ', $event['event_type'] ?? 'Delivery update'),
                'timestamp' => $event['occurred_at'] ?? null,
                'description' => trim(($event['location'] ?? '').' '.($event['notes'] ?? '')) ?: null,
                'active' => true,
                'source' => 'delivery',
            ];
        }

        if ($this->relationLoaded('logs')) {
            foreach ($this->logs as $log) {
                if (in_array($log->action, ['created', 'accepted', 'reserved', 'in_transfer', 'patient_arrived', 'completed'])) {
                    continue;
                }

                $items[] = [
                    'key' => $log->action,
                    'label' => str_replace('_', ' ', $log->action),
                    'timestamp' => optional($log->created_at)->toISOString(),
                    'description' => $log->remarks,
                    'active' => true,
                    'source' => 'audit',
                ];
            }
        }

        usort($items, fn ($a, $b) => strcmp((string) ($a['timestamp'] ?? '9999-12-31'), (string) ($b['timestamp'] ?? '9999-12-31')));

        return $items;
    }

    private function timelineItem(string $key, string $label, $timestamp, ?string $description): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'timestamp' => $timestamp ? $timestamp->toISOString() : null,
            'description' => $description,
            'active' => (bool) $timestamp && (bool) $description,
            'source' => 'workflow',
        ];
    }

    private function statusInOrPast(array $statuses): bool
    {
        return in_array($this->status, $statuses, true);
    }
}
