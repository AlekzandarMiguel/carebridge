import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTransferRequest, markPatientArrived, completeTransfer, updateCoordinatorNotes, updateRouteEstimate, addDeliveryEvent } from '../api/axios';
import StatusBadge from '../components/StatusBadge';

const deliveryLabels = {
    not_started: 'Not Started',
    en_route: 'En Route',
    arrived: 'Arrived',
    delivered: 'Delivered',
};

const deliverySteps = ['not_started', 'en_route', 'arrived', 'delivered'];

const checklistLabels = {
    referral_note: 'Referral note',
    lab_results: 'Lab results',
    imaging: 'Imaging summary',
    consent: 'Consent',
    transport_form: 'Transport form',
};

export default function TransferDetail() {
    const { id } = useParams();
    const [transfer, setTransfer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [coordinatorNotes, setCoordinatorNotes] = useState('');
    const [handoffNotes, setHandoffNotes] = useState('');
    const [routeForm, setRouteForm] = useState({ route_distance_km: '', estimated_travel_minutes: '' });
    const [eventForm, setEventForm] = useState({ event_type: 'location_update', location: '', notes: '' });
    const user = JSON.parse(localStorage.getItem('carebridge_user') || '{}');

    const loadTransfer = async () => {
        try {
            const res = await getTransferRequest(id);
            setTransfer(res.data.transfer_request);
            setCoordinatorNotes(res.data.transfer_request.coordinator_notes || '');
            setHandoffNotes(res.data.transfer_request.handoff_notes || '');
            setRouteForm({
                route_distance_km: res.data.transfer_request.route_distance_km || '',
                estimated_travel_minutes: res.data.transfer_request.estimated_travel_minutes || '',
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load rejected patient case detail.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransfer();
    }, [id]);

    const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';
    const canReceive = transfer && user.role === 'receiving_staff' && transfer.receiving_hospital_id === user.hospital_id;
    const canMonitor = ['coordinator', 'dispatcher', 'admin'].includes(user.role);
    const canUpdateDelivery = transfer && (canMonitor || canReceive || (user.role === 'sending_staff' && transfer.sending_hospital_id === user.hospital_id));

    const runAction = async (action, success) => {
        setMessage('');
        setError('');
        try {
            await action(transfer.id);
            setMessage(success);
            loadTransfer();
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed.');
        }
    };

    const saveCoordinatorNotes = async () => {
        setMessage('');
        setError('');
        try {
            await updateCoordinatorNotes(transfer.id, coordinatorNotes);
            setMessage('Coordinator notes saved.');
            loadTransfer();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to save coordinator notes.');
        }
    };

    const saveRouteEstimate = async () => {
        setMessage('');
        setError('');
        try {
            await updateRouteEstimate(transfer.id, {
                route_distance_km: routeForm.route_distance_km || null,
                estimated_travel_minutes: routeForm.estimated_travel_minutes || null,
            });
            setMessage('Route estimate saved.');
            loadTransfer();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to save route estimate.');
        }
    };

    const submitDeliveryEvent = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');
        try {
            await addDeliveryEvent(transfer.id, eventForm);
            setEventForm({ event_type: 'location_update', location: '', notes: '' });
            setMessage('Delivery timeline updated.');
            loadTransfer();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to add delivery update.');
        }
    };

    if (loading) return <div className="loading">Loading rejected patient case detail...</div>;
    if (!transfer) return <div className="empty-state"><p>{error || 'Case not found.'}</p></div>;

    const deliveryStatus = transfer.delivery_status || 'not_started';
    const currentStep = deliverySteps.indexOf(deliveryStatus);
    const timeline = [
        ['Created', transfer.created_at],
        ['Delivery Started', transfer.delivery_started_at],
        ['Patient Arrived', transfer.patient_arrived_at],
        ['Delivery Completed', transfer.delivery_completed_at],
    ];

    return (
        <div>
            <div className="feature-hero transfer-hero">
                <div>
                    <span>Rejected Case Summary</span>
                    <h2>Placement and Delivery Detail</h2>
                    <p>Rejected patient placement, delivery timeline, transport information, and audit history.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{transfer.patient_reference_code}</strong><small>Reference</small></div>
                    <div><strong>{transfer.urgency_level}</strong><small>Urgency</small></div>
                    <div><StatusBadge status={transfer.status} /><small>Status</small></div>
                </div>
            </div>

            <div className="page-toolbar">
                <div className="delivery-progress">
                    {deliverySteps.map((step, index) => (
                        <div key={step} className={index <= currentStep ? 'active' : ''}>
                            <span></span>
                            <strong>{deliveryLabels[step]}</strong>
                        </div>
                    ))}
                </div>
                <div className="action-buttons">
                    <button className="btn btn-outline" onClick={() => window.print()}>Print Summary</button>
                    <Link to="/transfer-tracking" className="btn btn-outline">Back</Link>
                </div>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="detail-grid">
                <div className="card">
                    <div className="card-header">
                        <span>{transfer.patient_reference_code}</span>
                        <StatusBadge status={transfer.status} />
                    </div>
                    <div className="card-body detail-list detail-list-panel">
                        <div><span>Sending Hospital</span><strong>{transfer.sending_hospital?.name}</strong></div>
                        <div><span>Accepting Hospital</span><strong>{transfer.receiving_hospital?.name || '-'}</strong></div>
                        <div><span>Case Type</span><strong>{transfer.case_type}</strong></div>
                        <div><span>Urgency</span><strong>{transfer.urgency_level}</strong></div>
                        <div><span>Rejected Patient Reason</span><strong>{transfer.rejection_reason || '-'}</strong></div>
                        <div><span>Placement Need</span><strong>{transfer.placement_need || '-'}</strong></div>
                        <div><span>Documents Ready</span><strong>{transfer.documents_ready ? 'Yes' : 'No'}</strong></div>
                        <div><span>Privacy Confirmed</span><strong>{transfer.privacy_confirmed ? 'Yes' : 'No'}</strong></div>
                        <div><span>Accept Conditions</span><strong>{transfer.accept_conditions || '-'}</strong></div>
                        <div><span>Notes</span><strong>{transfer.notes || '-'}</strong></div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">Patient Delivery</div>
                    <div className="card-body detail-list detail-list-panel">
                        <div><span>Status</span><strong>{deliveryLabels[deliveryStatus]}</strong></div>
                        <div><span>Last Location</span><strong>{transfer.delivery_last_location || 'Waiting for departure'}</strong></div>
                        <div><span>Transport Team</span><strong>{transfer.transport_team || '-'}</strong></div>
                        <div><span>Ambulance / Unit</span><strong>{transfer.ambulance_unit || '-'}</strong></div>
                        <div><span>Transport Contact</span><strong>{transfer.transport_contact || '-'}</strong></div>
                        <div><span>Estimated Arrival</span><strong>{formatDate(transfer.estimated_arrival_at)}</strong></div>
                        <div><span>Route Distance</span><strong>{transfer.route_distance_km ? `${transfer.route_distance_km} km` : '-'}</strong></div>
                        <div><span>Travel Estimate</span><strong>{transfer.estimated_travel_minutes ? `${transfer.estimated_travel_minutes} min` : '-'}</strong></div>
                        <div><span>Assigned Dispatcher</span><strong>{transfer.assigned_dispatcher?.name || 'Unassigned'}</strong></div>
                        <div><span>Delivery Notes</span><strong>{transfer.delivery_notes || '-'}</strong></div>
                        <div><span>Handoff Notes</span><strong>{transfer.handoff_notes || '-'}</strong></div>
                        {transfer.status === 'in_transfer' && canReceive && (
                            <div className="action-buttons">
                                {deliveryStatus !== 'arrived' && (
                                    <button className="btn btn-info btn-sm" onClick={() => runAction(markPatientArrived, 'Patient arrival recorded.')}>Mark Arrived</button>
                                )}
                                {deliveryStatus === 'arrived' && (
                                    <>
                                        <textarea
                                            className="inline-textarea"
                                            value={handoffNotes}
                                            onChange={(e) => setHandoffNotes(e.target.value)}
                                            placeholder="Handoff notes for receiving team"
                                        />
                                        <button className="btn btn-success btn-sm" onClick={() => runAction((transferId) => completeTransfer(transferId, { handoff_notes: handoffNotes }), 'Delivery completed.')}>Complete Delivery</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {canUpdateDelivery && (
                <div className="detail-grid mt-24">
                    <div className="card">
                        <div className="card-header">Route Estimate</div>
                        <div className="card-body">
                            <div className="route-estimate-grid">
                                <div className="form-group">
                                    <label>Distance KM</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={routeForm.route_distance_km}
                                        onChange={(e) => setRouteForm({ ...routeForm, route_distance_km: e.target.value })}
                                        placeholder="e.g., 12.5"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Estimated Travel Minutes</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={routeForm.estimated_travel_minutes}
                                        onChange={(e) => setRouteForm({ ...routeForm, estimated_travel_minutes: e.target.value })}
                                        placeholder="e.g., 28"
                                    />
                                </div>
                            </div>
                            <button className="btn btn-primary btn-sm" type="button" onClick={saveRouteEstimate}>Save Route</button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">Add Delivery Update</div>
                        <div className="card-body">
                            <form className="delivery-event-form" onSubmit={submitDeliveryEvent}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Event</label>
                                        <select value={eventForm.event_type} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}>
                                            <option value="departed">Departed</option>
                                            <option value="location_update">Location update</option>
                                            <option value="delayed">Delayed</option>
                                            <option value="arrived_gate">Arrived at receiving area</option>
                                            <option value="handoff_completed">Handoff completed</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Location</label>
                                        <input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} placeholder="Current location or checkpoint" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} placeholder="Short delivery update..." />
                                </div>
                                <button className="btn btn-primary btn-sm" type="submit">Add Update</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <div className="card mt-24">
                <div className="card-header">Document Checklist</div>
                <div className="card-body checklist-summary">
                    {Object.entries(checklistLabels).map(([key, label]) => {
                        const ready = Boolean(transfer.document_checklist?.[key]);

                        return (
                            <div className={ready ? 'ready' : ''} key={key}>
                                <span>{ready ? 'Ready' : 'Missing'}</span>
                                <strong>{label}</strong>
                            </div>
                        );
                    })}
                </div>
            </div>

            {canMonitor && (
                <div className="card mt-24">
                    <div className="card-header">Coordinator Notes</div>
                    <div className="card-body">
                        <textarea
                            className="wide-textarea"
                            value={coordinatorNotes}
                            onChange={(e) => setCoordinatorNotes(e.target.value)}
                            placeholder="Internal coordination notes, follow-ups, or escalation context..."
                        />
                        <button className="btn btn-primary btn-sm mt-16" onClick={saveCoordinatorNotes}>Save Notes</button>
                    </div>
                </div>
            )}

            <div className="detail-grid mt-24">
                <div className="card">
                    <div className="card-header">Delivery Timeline</div>
                    <div className="card-body timeline-list advanced-timeline">
                        {timeline.map(([label, date]) => (
                            <div key={label} className={date ? 'active' : ''}>
                                <span></span>
                                <strong>{label}</strong>
                                <small>{formatDate(date)}</small>
                            </div>
                        ))}
                        {(transfer.delivery_events || []).map((event) => (
                            <div key={event.id} className="active delivery-event-item">
                                <span></span>
                                <strong>{event.label || event.event_type?.replace('_', ' ')}</strong>
                                <small>{formatDate(event.occurred_at)} {event.location ? `- ${event.location}` : ''}</small>
                                {event.notes && <em>{event.notes}</em>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">Audit Trail</div>
                    <div className="card-body audit-list advanced-audit">
                        {(transfer.logs || []).map((log) => (
                            <div key={log.id}>
                                <strong>{log.action?.replace('_', ' ')}</strong>
                                <span>{log.remarks || 'No remarks'} by {log.user?.name || 'System'}</span>
                                <small>{formatDate(log.created_at)}</small>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
