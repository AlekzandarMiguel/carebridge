import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHospitals, getSystemSettings, getTransferBoard, escalateTransfer, assignDispatcher } from '../api/axios';
import StatusBadge from '../components/StatusBadge';

const columns = [
    ['pending', 'Pending'],
    ['accepted', 'Accepted'],
    ['reserved', 'Reserved'],
    ['in_transfer', 'In Movement'],
    ['completed', 'Completed'],
    ['declined', 'Declined'],
];

const urgencyOrder = ['critical', 'urgent', 'normal'];

export default function CoordinatorBoard() {
    const [board, setBoard] = useState({});
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [escalatingId, setEscalatingId] = useState(null);
    const [assigningId, setAssigningId] = useState(null);
    const [assignmentDrafts, setAssignmentDrafts] = useState({});
    const [hospitals, setHospitals] = useState([]);
    const [dispatchers, setDispatchers] = useState([]);
    const [settings, setSettings] = useState({ sla_pending_minutes: 20 });

    const loadBoard = async () => {
        try {
            const res = await getTransferBoard();
            setBoard(res.data.board);
            setDispatchers(res.data.dispatchers || []);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (event, request) => {
        event.preventDefault();
        event.stopPropagation();
        const dispatcherId = assignmentDrafts[request.id] || request.assigned_dispatcher_id;
        if (!dispatcherId) {
            setError('Choose a dispatcher before assigning.');
            return;
        }

        setAssigningId(request.id);
        setMessage('');
        setError('');

        try {
            await assignDispatcher(request.id, dispatcherId);
            setMessage(`${request.patient_reference_code} assigned for monitoring.`);
            loadBoard();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to assign dispatcher.');
        } finally {
            setAssigningId(null);
        }
    };

    useEffect(() => {
        loadBoard();
        getHospitals().then((res) => setHospitals(res.data.hospitals || [])).catch(() => {});
        getSystemSettings().then((res) => setSettings(res.data.settings || settings)).catch(() => {});
        const interval = setInterval(loadBoard, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleEscalate = async (event, request) => {
        event.preventDefault();
        event.stopPropagation();
        setEscalatingId(request.id);
        setMessage('');
        setError('');

        try {
            await escalateTransfer(request.id, `${request.urgency_level} request flagged from command view.`);
            setMessage(`${request.patient_reference_code} escalated.`);
            loadBoard();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to escalate request.');
        } finally {
            setEscalatingId(null);
        }
    };

    if (loading) return <div className="loading">Loading command board...</div>;

    const allRequests = Object.values(board).flat();
    const activeCount = ['pending', 'accepted', 'reserved', 'in_transfer'].reduce((total, status) => total + (board[status]?.length || 0), 0);
    const criticalCount = allRequests.filter((req) => req.urgency_level === 'critical').length;
    const movementCount = allRequests.filter((req) => req.status === 'in_transfer').length;
    const waitingMinutes = (dateStr) => Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
    const slaMinutes = Number(settings.sla_pending_minutes || 20);
    const delayedRequests = allRequests.filter((req) => ['pending', 'accepted'].includes(req.status) && waitingMinutes(req.created_at) >= slaMinutes);
    const escalatedRequests = allRequests.filter((req) => req.is_escalated);
    const pressureHospitals = hospitals
        .map((hospital) => {
            const capacity = hospital.latest_capacity;
            const totalBeds = capacity ? capacity.general_beds_available + capacity.emergency_beds_available + capacity.icu_beds_available : 0;
            return { ...hospital, totalBeds };
        })
        .sort((a, b) => a.totalBeds - b.totalBeds)
        .slice(0, 4);
    const rerouteHospitals = hospitals
        .map((hospital) => {
            const capacity = hospital.latest_capacity;
            const totalBeds = capacity ? capacity.general_beds_available + capacity.emergency_beds_available + capacity.icu_beds_available : 0;
            return { ...hospital, totalBeds };
        })
        .filter((hospital) => hospital.totalBeds > 0)
        .sort((a, b) => b.totalBeds - a.totalBeds)
        .slice(0, 3);

    return (
        <div>
            <div className="feature-hero">
                <div>
                    <span>Department Dispatch</span>
                    <h2>Rejected Patient Command View</h2>
                    <p>Active placement and delivery cases grouped by operational state and sorted by urgency.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{activeCount}</strong><small>Active</small></div>
                    <div><strong>{criticalCount}</strong><small>Critical</small></div>
                    <div><strong>{movementCount}</strong><small>In delivery</small></div>
                </div>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="insight-grid mb-24">
                <div className="insight-panel">
                    <span>Escalation Dashboard</span>
                    <strong>{escalatedRequests.length}</strong>
                    <p>Rejected patient cases already flagged for follow-up.</p>
                </div>
                <div className="insight-panel">
                    <span>SLA Timers</span>
                    <strong>{delayedRequests.length}</strong>
                    <p>Pending or accepted cases waiting {slaMinutes}+ minutes.</p>
                </div>
                <div className="insight-panel">
                    <span>Network Pressure</span>
                    <strong>{pressureHospitals[0]?.totalBeds ?? 0}</strong>
                    <p>Lowest available bed count for placement decisions.</p>
                </div>
            </div>

            <div className="detail-grid mb-24">
                <div className="card">
                    <div className="card-header">Hospitals Under Pressure</div>
                    <div className="card-body compact-list">
                        {pressureHospitals.map((hospital) => (
                            <div key={hospital.id}>
                                <strong>{hospital.name}</strong>
                                <span>{hospital.totalBeds} beds open</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">Placement Suggestions</div>
                    <div className="card-body compact-list">
                        {rerouteHospitals.map((hospital) => (
                            <div key={hospital.id}>
                                <strong>{hospital.name}</strong>
                                <span>{hospital.totalBeds} beds open - {hospital.contact_number}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="board-grid">
                {columns.map(([status, label], index) => (
                    <section className="board-column" key={status}>
                        <div className={`board-column-header board-lane-${index}`}>
                            <div>
                                <strong>{label}</strong>
                                <small>{status === 'in_transfer' ? 'Delivery movement' : 'Department queue'}</small>
                            </div>
                            <span>{board[status]?.length || 0}</span>
                        </div>
                        <div className="board-card-list">
                            {(board[status] || []).sort((a, b) => urgencyOrder.indexOf(a.urgency_level) - urgencyOrder.indexOf(b.urgency_level)).map((req) => (
                                <Link to={`/transfer-requests/${req.id}`} className="board-card" key={req.id}>
                                    <div className="flex-between">
                                        <strong>{req.patient_reference_code}</strong>
                                        <StatusBadge status={req.status} />
                                    </div>
                                    {req.is_escalated && (
                                        <span className="escalation-banner">Escalated: {req.escalation_reason || 'Needs attention'}</span>
                                    )}
                                    <p>{req.sending_hospital?.name} to {req.receiving_hospital?.name || '-'}</p>
                                    <div className="board-card-meta">
                                        <span className={`urgency-${req.urgency_level}`}>{req.urgency_level}</span>
                                        <small>{req.case_type}</small>
                                        <small>{waitingMinutes(req.created_at)} min waiting</small>
                                    </div>
                                    <div className="board-location">{req.delivery_last_location || 'No delivery movement yet'}</div>
                                    <div className="assignment-strip">
                                        <small>Dispatcher</small>
                                        <strong>{req.assigned_dispatcher?.name || 'Unassigned'}</strong>
                                    </div>
                                    {['pending', 'accepted', 'reserved', 'in_transfer'].includes(req.status) && (
                                        <div className="assignment-control" onClick={(event) => event.preventDefault()}>
                                            <select
                                                value={assignmentDrafts[req.id] ?? req.assigned_dispatcher_id ?? ''}
                                                onChange={(event) => setAssignmentDrafts({ ...assignmentDrafts, [req.id]: event.target.value })}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                }}
                                            >
                                                <option value="">Assign monitor</option>
                                                {dispatchers.map((dispatcher) => (
                                                    <option value={dispatcher.id} key={dispatcher.id}>{dispatcher.name} ({dispatcher.role.replace('_', ' ')})</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                disabled={assigningId === req.id}
                                                onClick={(event) => handleAssign(event, req)}
                                            >
                                                Assign
                                            </button>
                                        </div>
                                    )}
                                    {['pending', 'accepted', 'reserved', 'in_transfer'].includes(req.status) && !req.is_escalated && (
                                        <button
                                            type="button"
                                            className="btn btn-warning btn-sm"
                                            disabled={escalatingId === req.id}
                                            onClick={(event) => handleEscalate(event, req)}
                                        >
                                            Escalate
                                        </button>
                                    )}
                                </Link>
                            ))}
                            {(board[status] || []).length === 0 && (
                                <div className="board-empty">No cases in this lane.</div>
                            )}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
