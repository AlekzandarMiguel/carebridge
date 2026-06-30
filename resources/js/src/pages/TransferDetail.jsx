import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { archiveTransfer, downloadBlob, downloadTransferAttachment, getTransferRequest, markPatientArrived, completeTransfer, updateCoordinatorNotes, updateRouteEstimate, addDeliveryEvent, uploadTransferAttachment, deleteTransferAttachment, unarchiveTransfer } from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import RouteMap from '../components/RouteMap';

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
    const [routeForm, setRouteForm] = useState({ route_distance_km: '', estimated_travel_minutes: '', override_reason: '' });
    const [eventForm, setEventForm] = useState({ event_type: 'location_update', location: '', notes: '', override_reason: '' });
    const [attachmentForm, setAttachmentForm] = useState({ document_type: 'supporting_document', file: null });
    const [attachmentLoading, setAttachmentLoading] = useState(false);
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
                override_reason: '',
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
    const canUpdateDelivery = transfer && (
        ['coordinator', 'admin'].includes(user.role)
        || (user.role === 'dispatcher' && (!transfer.assigned_dispatcher_id || Number(transfer.assigned_dispatcher_id) === Number(user.id)))
    );

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
                override_reason: routeForm.override_reason || null,
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
            setEventForm({ event_type: 'location_update', location: '', notes: '', override_reason: '' });
            setMessage('Delivery timeline updated.');
            loadTransfer();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to add delivery update.');
        }
    };

    const submitAttachment = async (event) => {
        event.preventDefault();
        if (!attachmentForm.file) {
            setError('Choose a document before uploading.');
            return;
        }

        setAttachmentLoading(true);
        setMessage('');
        setError('');

        try {
            const payload = new FormData();
            payload.append('document_type', attachmentForm.document_type);
            payload.append('file', attachmentForm.file);
            await uploadTransferAttachment(transfer.id, payload);
            setAttachmentForm({ document_type: 'supporting_document', file: null });
            event.target.reset();
            setMessage('Attachment uploaded.');
            loadTransfer();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to upload attachment.');
        } finally {
            setAttachmentLoading(false);
        }
    };

    const downloadAttachment = async (attachment) => {
        setError('');
        try {
            const res = await downloadTransferAttachment(transfer.id, attachment.id);
            downloadBlob(res.data, attachment.original_name);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to download attachment.');
        }
    };

    const removeAttachment = async (attachmentId) => {
        if (!window.confirm('Remove this attachment?')) return;

        setMessage('');
        setError('');

        try {
            await deleteTransferAttachment(transfer.id, attachmentId);
            setMessage('Attachment removed.');
            loadTransfer();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to remove attachment.');
        }
    };

    const toggleArchive = async () => {
        setMessage('');
        setError('');
        try {
            if (transfer.archived_at) {
                await unarchiveTransfer(transfer.id);
                setMessage('Case restored.');
            } else {
                await archiveTransfer(transfer.id, 'Closed from case detail.');
                setMessage('Case archived.');
            }
            loadTransfer();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update archive status.');
        }
    };

    const downloadCaseSummary = () => {
        const lines = [
            'CareBridge Placement Case Summary',
            `Reference: ${transfer.patient_reference_code}`,
            `Status: ${transfer.status}`,
            `Priority: ${transfer.priority_label || '-'} (${transfer.priority_score || '-'})`,
            `Rejected From: ${transfer.sending_hospital?.name || '-'}`,
            `Accepting Hospital: ${transfer.receiving_hospital?.name || '-'}`,
            `Case Type: ${transfer.case_type}`,
            `Urgency: ${transfer.urgency_level}`,
            `Rejected Reason: ${transfer.rejection_reason || '-'}`,
            `Placement Need: ${transfer.placement_need || '-'}`,
            `Dispatcher: ${transfer.assigned_dispatcher?.name || 'Unassigned'}`,
            `Ambulance / Unit: ${transfer.ambulance_unit || '-'}`,
            `Transport Contact: ${transfer.transport_contact || '-'}`,
            `Route: ${transfer.route_distance_km || '-'} km / ${transfer.estimated_travel_minutes || '-'} min`,
            `Last Location: ${transfer.delivery_last_location || '-'}`,
            `Delivery Notes: ${transfer.delivery_notes || '-'}`,
            '',
            'Timeline',
            ...(transfer.unified_timeline || []).map((item) => `${item.label}: ${formatDate(item.timestamp)} ${item.description || ''}`),
            '',
            'Audit Trail',
            ...(transfer.logs || []).map((log) => `${formatDate(log.created_at)} - ${log.action}: ${log.remarks || '-'} (${log.user?.name || 'System'})`),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${transfer.patient_reference_code}-summary.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    if (loading) return <div className="loading">Loading rejected patient case detail...</div>;
    if (!transfer) return <div className="empty-state"><p>{error || 'Case not found.'}</p></div>;

    const deliveryStatus = transfer.delivery_status || 'not_started';
    const currentStep = deliverySteps.indexOf(deliveryStatus);
    const timeline = (transfer.unified_timeline || []).filter((item) => item.active || item.timestamp);

    return (
        <div>
            <div className="page-header">
                <div>
                    <span>Rejected Case Summary</span>
                    <h2>Placement and Delivery Detail</h2>
                    <p>Rejected patient placement, delivery timeline, transport information, and audit history.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{transfer.patient_reference_code}</strong><small>Reference</small></div>
                    <div><strong>{transfer.urgency_level}</strong><small>Urgency</small></div>
                    <div><strong>{transfer.priority_score}</strong><small>{transfer.priority_label} priority</small></div>
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
                    <button className="btn btn-outline" type="button" onClick={downloadCaseSummary}>Download Summary</button>
                    {canMonitor && (
                        <button className="btn btn-outline" type="button" onClick={toggleArchive}>
                            {transfer.archived_at ? 'Restore Case' : 'Archive Case'}
                        </button>
                    )}
                    <Link to="/placement-tracking" className="btn btn-outline">Back</Link>
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
                        <div><span>Rejected From</span><strong>{transfer.sending_hospital?.name}</strong></div>
                        <div><span>Accepting Hospital</span><strong>{transfer.receiving_hospital?.name || '-'}</strong></div>
                        <div><span>Case Type</span><strong>{transfer.case_type}</strong></div>
                        <div><span>Urgency</span><strong>{transfer.urgency_level}</strong></div>
                        <div><span>Priority Score</span><strong>{transfer.priority_score} - {transfer.priority_label}</strong></div>
                        <div><span>Rejected Patient Reason</span><strong>{transfer.rejection_reason || '-'}</strong></div>
                        <div><span>Placement Need</span><strong>{transfer.placement_need || '-'}</strong></div>
                        <div><span>Documents Ready</span><strong>{transfer.documents_ready ? 'Yes' : 'No'}</strong></div>
                        <div><span>Privacy Confirmed</span><strong>{transfer.privacy_confirmed ? 'Yes' : 'No'}</strong></div>
                        <div><span>Accept Conditions</span><strong>{transfer.accept_conditions || '-'}</strong></div>
                        <div><span>Archive Status</span><strong>{transfer.archived_at ? `Archived - ${transfer.archive_reason || 'No reason'}` : 'Active'}</strong></div>
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

            <div className="card mt-24 route-map-card">
                <div className="card-header">Placement Route</div>
                <div className="card-body">
                    <RouteMap transfer={transfer} />
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
                            {canMonitor && (
                                <div className="form-group">
                                    <label>Override Reason</label>
                                    <input
                                        value={routeForm.override_reason}
                                        onChange={(e) => setRouteForm({ ...routeForm, override_reason: e.target.value })}
                                        placeholder="Required for coordinator/admin route updates"
                                    />
                                </div>
                            )}
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
                                            <option value="arrived_gate">Arrived at accepting area</option>
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
                                {canMonitor && (
                                    <div className="form-group">
                                        <label>Override Reason</label>
                                        <input
                                            value={eventForm.override_reason}
                                            onChange={(e) => setEventForm({ ...eventForm, override_reason: e.target.value })}
                                            placeholder="Required for coordinator/admin delivery updates"
                                        />
                                    </div>
                                )}
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

            <div className="card mt-24">
                <div className="card-header">Case Attachments</div>
                <div className="card-body attachment-workspace">
                    <form className="attachment-upload" onSubmit={submitAttachment}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Document Type</label>
                                <select value={attachmentForm.document_type} onChange={(e) => setAttachmentForm({ ...attachmentForm, document_type: e.target.value })}>
                                    <option value="referral_note">Referral note</option>
                                    <option value="lab_results">Lab results</option>
                                    <option value="imaging">Imaging</option>
                                    <option value="consent">Consent</option>
                                    <option value="transport_form">Transport form</option>
                                    <option value="supporting_document">Supporting document</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>File</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) => setAttachmentForm({ ...attachmentForm, file: e.target.files?.[0] || null })}
                                />
                            </div>
                        </div>
                        <button className="btn btn-primary btn-sm" type="submit" disabled={attachmentLoading}>
                            {attachmentLoading ? 'Uploading...' : 'Upload Document'}
                        </button>
                    </form>

                    <div className="attachment-list">
                        {(transfer.attachments || []).length === 0 ? (
                            <div className="board-empty">No documents uploaded yet.</div>
                        ) : transfer.attachments.map((attachment) => (
                            <div key={attachment.id} className="attachment-item">
                                <div>
                                    <strong>{attachment.original_name}</strong>
                                    <span>{attachment.document_type?.replace('_', ' ')} - {Math.max(1, Math.round((attachment.size_bytes || 0) / 1024))} KB - {attachment.uploader?.name || 'Unknown uploader'}</span>
                                </div>
                                <div className="action-buttons">
                                    <button className="btn btn-outline btn-sm" type="button" onClick={() => downloadAttachment(attachment)}>Download</button>
                                    {(user.role === 'admin' || attachment.uploaded_by === user.id) && (
                                        <button className="btn btn-danger btn-sm" type="button" onClick={() => removeAttachment(attachment.id)}>Remove</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
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
                        {timeline.map((item, index) => (
                            <div key={`${item.key}-${item.timestamp || index}`} className={item.active ? 'active' : ''}>
                                <span></span>
                                <strong>{item.label}</strong>
                                <small>{formatDate(item.timestamp)}</small>
                                {item.description && <em>{item.description}</em>}
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
