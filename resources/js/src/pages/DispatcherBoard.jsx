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

export default function DispatcherBoard() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [routeDrafts, setRouteDrafts] = useState({});
    const [eventDrafts, setEventDrafts] = useState({});
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
            });
            setMessage('Route estimate updated.');
            loadBoard();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update route estimate.');
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
            });
            setEventDrafts({ ...eventDrafts, [request.id]: { event_type: 'location_update', location: '', notes: '' } });
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

    const renderCard = (request, canEdit = false) => {
        const deliveryStatus = request.delivery_status || 'not_started';
        const routeDraft = routeDrafts[request.id] || {};
        const eventDraft = eventDrafts[request.id] || { event_type: 'location_update', location: '', notes: '' };

        return (
            <article className={`dispatcher-card ${request.needs_attention ? 'needs-attention' : ''}`} key={request.id}>
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
                    <span>{request.ambulance_unit || 'No ambulance unit yet'}</span>
                    <span>{request.transport_contact || 'No transport contact yet'}</span>
                    <span>{request.delivery_last_location || 'Waiting for location update'}</span>
                </div>

                {request.needs_attention && (
                    <div className={`sla-banner sla-${request.sla_state || request.delivery_eta_state}`}>
                        {request.sla_state === 'breached' ? 'SLA breached' : request.delivery_eta_state === 'late' ? 'ETA late' : 'Needs attention'}
                    </div>
                )}

                {canEdit && (
                    <div className="dispatcher-actions">
                        <div className="route-estimate-grid">
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
                            <button className="btn btn-primary btn-sm" type="button" onClick={() => saveRoute(request)}>Save Route</button>
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
                                value={eventDraft.notes || ''}
                                onChange={(event) => setEventDrafts({ ...eventDrafts, [request.id]: { ...eventDraft, notes: event.target.value } })}
                                placeholder="Short update"
                            />
                            <button className="btn btn-outline btn-sm" type="button" onClick={() => addEvent(request)}>Add Update</button>
                        </div>
                    </div>
                )}

                <div className="action-buttons">
                    {!request.assigned_dispatcher_id && <button className="btn btn-primary btn-sm" type="button" onClick={() => claimCase(request)}>Claim Case</button>}
                    <Link className="btn btn-outline btn-sm" to={`/placement-cases/${request.id}`}>Details</Link>
                </div>
            </article>
        );
    };

    return (
        <div>
            <div className="feature-hero">
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

            <div className="dispatcher-board-grid">
                <section>
                    <div className="section-heading-row"><h3>My Delivery Cases</h3><span>{mine.length}</span></div>
                    <div className="dispatcher-card-list">{mine.length ? mine.map((item) => renderCard(item, true)) : <div className="board-empty">No cases assigned to you.</div>}</div>
                </section>
                <section>
                    <div className="section-heading-row"><h3>Unassigned Cases</h3><span>{unassigned.length}</span></div>
                    <div className="dispatcher-card-list">{unassigned.length ? unassigned.map((item) => renderCard(item)) : <div className="board-empty">No unassigned cases.</div>}</div>
                </section>
                <section>
                    <div className="section-heading-row"><h3>Other Active Cases</h3><span>{other.length}</span></div>
                    <div className="dispatcher-card-list">{other.length ? other.map((item) => renderCard(item)) : <div className="board-empty">No other active cases.</div>}</div>
                </section>
            </div>
        </div>
    );
}
