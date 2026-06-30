import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDeliveryEvent, assignDispatcher, getTransferTracking, updateRouteEstimate } from '../api/axios';
import StatusBadge from '../components/StatusBadge';

const deliveryLabels = {
    not_started: 'Waiting',
    en_route: 'En Route',
    arrived: 'Arrived',
    delivered: 'Delivered',
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '-';

export default function DispatcherBoard() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [routeDrafts, setRouteDrafts] = useState({});
    const [eventDrafts, setEventDrafts] = useState({});
    const [expandedCaseId, setExpandedCaseId] = useState(null);
    const user = JSON.parse(localStorage.getItem('carebridge_user') || '{}');

    const loadBoard = async () => {
        try {
            const res = await getTransferTracking(1, { archived: 'without' });
            setRows((res.data.transfer_requests?.data || []).filter((item) => ['pending', 'accepted', 'reserved', 'in_transfer'].includes(item.status)));
        } catch (err) {
            setError('Unable to load dispatcher board.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBoard();
        const interval = setInterval(loadBoard, 10000);
        return () => clearInterval(interval);
    }, []);

    const claimCase = async (request) => {
        setMessage('');
        setError('');
        try {
            await assignDispatcher(request.id, user.id);
            setMessage(`${request.patient_reference_code} assigned to you.`);
            loadBoard();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to claim this case.');
        }
    };

    const saveRoute = async (request) => {
        const draft = routeDrafts[request.id] || {};
        setMessage('');
        setError('');
        try {
            await updateRouteEstimate(request.id, {
                route_distance_km: draft.route_distance_km || request.route_distance_km || null,
                estimated_travel_minutes: draft.estimated_travel_minutes || request.estimated_travel_minutes || null,
                transport_team: draft.transport_team ?? request.transport_team ?? '',
                ambulance_unit: draft.ambulance_unit ?? request.ambulance_unit ?? '',
                transport_contact: draft.transport_contact ?? request.transport_contact ?? '',
                estimated_arrival_at: draft.estimated_arrival_at ?? request.estimated_arrival_at ?? null,
                delivery_last_location: draft.delivery_last_location ?? request.delivery_last_location ?? '',
            });
            setMessage('Delivery transport details updated.');
            loadBoard();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update delivery details.');
        }
    };

    const addEvent = async (request) => {
        const draft = eventDrafts[request.id] || {};
        setMessage('');
        setError('');
        try {
            await addDeliveryEvent(request.id, {
                event_type: draft.event_type || 'location_update',
                location: draft.location || '',
                notes: draft.notes || '',
                occurred_at: draft.occurred_at || null,
            });
            setEventDrafts({ ...eventDrafts, [request.id]: { event_type: 'location_update', location: '', notes: '', occurred_at: '' } });
            setMessage('Delivery update added.');
            loadBoard();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to add delivery update.');
        }
    };

    if (loading) return <div className="loading">Loading dispatcher board...</div>;

    const unassigned = rows.filter((item) => !item.assigned_dispatcher_id);
    const mine = rows.filter((item) => Number(item.assigned_dispatcher_id) === Number(user.id));
    const risk = rows.filter((item) => item.needs_attention);
    const other = rows.filter((item) => item.assigned_dispatcher_id && Number(item.assigned_dispatcher_id) !== Number(user.id));
    const allDispatcherCases = [...mine, ...unassigned, ...other];

    const renderCard = (request, canEdit = false) => {
        const deliveryStatus = request.delivery_status || 'not_started';
        const routeDraft = routeDrafts[request.id] || {};
        const eventDraft = eventDrafts[request.id] || { event_type: 'location_update', location: '', notes: '', occurred_at: '' };
        const departedEvent = (request.delivery_events || []).find((event) => event.event_type === 'departed');
        const handoffEvent = (request.delivery_events || []).find((event) => event.event_type === 'handoff_completed');

        const isExpanded = Number(expandedCaseId) === Number(request.id);

        return (
            <article className={`dispatcher-card ${request.needs_attention ? 'needs-attention' : ''} ${canEdit ? 'is-editable' : ''} ${isExpanded ? 'is-expanded' : ''}`} key={request.id}>
                <div className="dispatcher-card-head">
                    <div>
                        <strong>{request.patient_reference_code}</strong>
                        <span>{request.sending_hospital?.name} to {request.receiving_hospital?.name || 'Searching'}</span>
                    </div>
                    <StatusBadge status={request.status} />
                </div>

                <div className="dispatcher-metrics">
                    <div><strong>{deliveryLabels[deliveryStatus]}</strong><span>Delivery</span></div>
                    <div><strong>{request.route_distance_km || '-'} km</strong><span>Distance</span></div>
                    <div><strong>{request.estimated_travel_minutes || '-'} min</strong><span>ETA</span></div>
                    <div><strong>{request.priority_score}</strong><span>Priority</span></div>
                </div>

                <div className="dispatcher-detail-line">
                    <span><small>Unit</small>{request.ambulance_unit || 'Unassigned'}</span>
                    <span><small>Contact</small>{request.transport_contact || 'Unassigned'}</span>
                    <span><small>Last Location</small>{request.delivery_last_location || 'Waiting for location update'}</span>
                </div>

                <div className="dispatcher-checklist">
                    <span className={request.assigned_dispatcher_id ? 'done' : ''}>Assigned</span>
                    <span className={request.ambulance_unit ? 'done' : ''}>Ambulance</span>
                    <span className={departedEvent || request.delivery_status === 'en_route' ? 'done' : ''}>Pickup</span>
                    <span className={request.estimated_arrival_at ? 'done' : ''}>ETA</span>
                    <span className={request.delivery_status === 'arrived' || request.delivery_status === 'delivered' ? 'done' : ''}>Arrival</span>
                    <span className={handoffEvent || request.delivery_status === 'delivered' ? 'done' : ''}>Handoff</span>
                </div>

                {request.needs_attention && (
                    <div className={`sla-banner sla-${request.sla_state || request.delivery_eta_state}`}>
                        {request.sla_state === 'breached' ? 'SLA breached' : request.delivery_eta_state === 'late' ? 'ETA late' : 'Needs attention'}
                    </div>
                )}

                {canEdit && isExpanded && (
                    <div className="dispatcher-actions">
                        <div className="dispatcher-form-panel">
                            <div className="dispatcher-form-head">
                                <strong>Transport Details</strong>
                                <span>Vehicle, team, ETA</span>
                            </div>
                            <div className="route-estimate-grid">
                            <input
                                value={routeDraft.ambulance_unit ?? request.ambulance_unit ?? ''}
                                onChange={(event) => setRouteDrafts({ ...routeDrafts, [request.id]: { ...routeDraft, ambulance_unit: event.target.value } })}
                                placeholder="Ambulance / vehicle"
                            />
                            <input
                                value={routeDraft.transport_team ?? request.transport_team ?? ''}
                                onChange={(event) => setRouteDrafts({ ...routeDrafts, [request.id]: { ...routeDraft, transport_team: event.target.value } })}
                                placeholder="Driver or team"
                            />
                            <input
                                value={routeDraft.transport_contact ?? request.transport_contact ?? ''}
                                onChange={(event) => setRouteDrafts({ ...routeDrafts, [request.id]: { ...routeDraft, transport_contact: event.target.value } })}
                                placeholder="Driver/contact number"
                            />
                            <input
                                type="datetime-local"
                                value={routeDraft.estimated_arrival_at ?? ''}
                                onChange={(event) => setRouteDrafts({ ...routeDrafts, [request.id]: { ...routeDraft, estimated_arrival_at: event.target.value } })}
                                title={`Current ETA: ${formatDateTime(request.estimated_arrival_at)}`}
                            />
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={routeDraft.route_distance_km ?? request.route_distance_km ?? ''}
                                onChange={(event) => setRouteDrafts({ ...routeDrafts, [request.id]: { ...routeDraft, route_distance_km: event.target.value } })}
                                placeholder="Distance km"
                            />
                            <input
                                type="number"
                                min="0"
                                value={routeDraft.estimated_travel_minutes ?? request.estimated_travel_minutes ?? ''}
                                onChange={(event) => setRouteDrafts({ ...routeDrafts, [request.id]: { ...routeDraft, estimated_travel_minutes: event.target.value } })}
                                placeholder="ETA min"
                            />
                            <input
                                value={routeDraft.delivery_last_location ?? request.delivery_last_location ?? ''}
                                onChange={(event) => setRouteDrafts({ ...routeDrafts, [request.id]: { ...routeDraft, delivery_last_location: event.target.value } })}
                                placeholder="Current location"
                            />
                            <button className="btn btn-primary btn-sm" type="button" onClick={() => saveRoute(request)}>Save Delivery Details</button>
                            </div>
                        </div>

                        <div className="dispatcher-form-panel">
                            <div className="dispatcher-form-head">
                                <strong>Delivery Update</strong>
                                <span>Movement log</span>
                            </div>
                            <div className="delivery-event-form">
                            <select
                                value={eventDraft.event_type}
                                onChange={(event) => setEventDrafts({ ...eventDrafts, [request.id]: { ...eventDraft, event_type: event.target.value } })}
                            >
                                <option value="location_update">Location update</option>
                                <option value="departed">Departed</option>
                                <option value="delayed">Delayed</option>
                                <option value="arrived_gate">Arrived at accepting area</option>
                                <option value="handoff_completed">Handoff completed</option>
                            </select>
                            <input
                                value={eventDraft.location || ''}
                                onChange={(event) => setEventDrafts({ ...eventDrafts, [request.id]: { ...eventDraft, location: event.target.value } })}
                                placeholder="Current location"
                            />
                            <input
                                type="datetime-local"
                                value={eventDraft.occurred_at || ''}
                                onChange={(event) => setEventDrafts({ ...eventDrafts, [request.id]: { ...eventDraft, occurred_at: event.target.value } })}
                            />
                            <input
                                value={eventDraft.notes || ''}
                                onChange={(event) => setEventDrafts({ ...eventDrafts, [request.id]: { ...eventDraft, notes: event.target.value } })}
                                placeholder="Short update"
                            />
                            <button className="btn btn-outline btn-sm" type="button" onClick={() => addEvent(request)}>Add Update</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="action-buttons">
                    {!request.assigned_dispatcher_id && <button className="btn btn-primary btn-sm" type="button" onClick={() => claimCase(request)}>Claim Case</button>}
                    {canEdit && (
                        <button
                            className="btn btn-primary btn-sm"
                            type="button"
                            onClick={() => setExpandedCaseId(isExpanded ? null : request.id)}
                        >
                            {isExpanded ? 'Close Update' : 'Update Delivery'}
                        </button>
                    )}
                    <Link className="btn btn-outline btn-sm" to={`/placement-cases/${request.id}`}>Details</Link>
                </div>
            </article>
        );
    };

    return (
        <div className="dispatcher-page">
            <div className="page-header">
                <div>
                    <span>Delivery Operations</span>
                    <h2>Dispatcher Board</h2>
                    <p>Claim unassigned placement cases, maintain route estimates, monitor ETA risk, and add delivery updates.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{unassigned.length}</strong><small>Unassigned</small></div>
                    <div><strong>{mine.length}</strong><small>Assigned to me</small></div>
                    <div><strong>{risk.length}</strong><small>Risk alerts</small></div>
                </div>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <section className="dispatcher-board-section">
                <div className="section-heading-row"><h3>All Dispatcher Cases</h3><span>{allDispatcherCases.length}</span></div>
                <div className="dispatcher-card-list">
                    {allDispatcherCases.length ? allDispatcherCases.map((item) => renderCard(item, Number(item.assigned_dispatcher_id) === Number(user.id))) : (
                        <div className="board-empty">No active dispatcher cases.</div>
                    )}
                </div>
            </section>
        </div>
    );
}
