import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIncomingRequests, acceptTransferWithConditions, declineTransfer, reserveTransfer } from '../api/axios';
import StatusBadge from '../components/StatusBadge';

export default function IncomingRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [declineReasons, setDeclineReasons] = useState({});
    const [acceptConditions, setAcceptConditions] = useState({});
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await getIncomingRequests();
            setRequests(res.data.incoming_requests);
        } catch (err) {
            console.error(err);
            setError('Unable to load acceptance queue.');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, actionFn, successMsg) => {
        setActionLoading(id);
        setError('');
        setSuccess('');
        try {
            await actionFn(id);
            setSuccess(successMsg);
            fetchRequests();
        } catch (err) {
            if (err.message !== 'Action cancelled.') {
                setError(err.response?.data?.message || 'Action failed.');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = (id) => {
        if (!window.confirm('Decline this rejected patient case and send it back for placement rerouting?')) {
            return Promise.reject(new Error('Action cancelled.'));
        }
        const reason = declineReasons[id] || 'no_general_bed';
        return declineTransfer(id, 'Declined by accepting hospital.', reason);
    };

    const handleAccept = (id) => {
        if (!window.confirm('Accept this rejected patient case for your hospital?')) {
            return Promise.reject(new Error('Action cancelled.'));
        }

        return acceptTransferWithConditions(id, acceptConditions[id] || '');
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const waitingMinutes = (dateStr) => Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
    const urgencyRank = { critical: 0, urgent: 1, normal: 2 };
    const triageRequests = requests
        .filter((req) => filter === 'all' || req.urgency_level === filter || req.status === filter)
        .sort((a, b) => (urgencyRank[a.urgency_level] ?? 3) - (urgencyRank[b.urgency_level] ?? 3) || waitingMinutes(b.created_at) - waitingMinutes(a.created_at));
    const criticalCount = requests.filter((req) => req.urgency_level === 'critical').length;
    const pendingCount = requests.filter((req) => req.status === 'pending').length;
    const longestWait = requests.length ? Math.max(...requests.map((req) => waitingMinutes(req.created_at))) : 0;
    const priorityScore = (req) => {
        const urgencyScore = { critical: 60, urgent: 35, normal: 15 }[req.urgency_level] || 10;
        return urgencyScore + Math.min(40, waitingMinutes(req.created_at));
    };
    const minutesUntil = (value) => value ? Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 60000)) : null;

    if (loading) return <div className="loading">Loading acceptance queue...</div>;

    return (
        <div>
            <div className="feature-hero">
                <div>
                    <span>Acceptance Desk</span>
                    <h2>Rejected Patient Acceptance Queue</h2>
                    <p>Cases are sorted by urgency and waiting time so the highest-risk rejected patients stay visible.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{pendingCount}</strong><small>Pending</small></div>
                    <div><strong>{criticalCount}</strong><small>Critical</small></div>
                    <div><strong>{longestWait}</strong><small>Longest wait min</small></div>
                </div>
            </div>

            <div className="directory-toolbar">
                <div className="triage-filters">
                    {['all', 'pending', 'critical', 'urgent', 'normal'].map((item) => (
                        <button
                            type="button"
                            key={item}
                            className={`filter-chip ${filter === item ? 'active' : ''}`}
                            onClick={() => setFilter(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
                <span>{triageRequests.length} cases shown</span>
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
                <div className="card-body">
                    {triageRequests.length === 0 ? (
                        <div className="empty-state">
                            <p>No rejected patient cases need acceptance right now.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>Rejected From</th>
                                        <th>Case Type</th>
                                        <th>Urgency</th>
                                        <th>Notes</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {triageRequests.map((req) => (
                                        <tr key={req.id}>
                                            <td><strong>{req.patient_reference_code}</strong></td>
                                            <td>{req.sending_hospital?.name}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{req.case_type}</td>
                                            <td className={`urgency-${req.urgency_level}`}>
                                                {req.urgency_level}
                                            </td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {req.notes || '-'}
                                            </td>
                                            <td><StatusBadge status={req.status} /></td>
                                            <td>
                                                <span className={`priority-score priority-${req.urgency_level}`}>{priorityScore(req)}</span>
                                                {req.reserved_until && <small className="block-muted">Reserve expires in {minutesUntil(req.reserved_until)} min</small>}
                                            </td>
                                            <td>{formatDate(req.created_at)}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <button
                                                                className="btn btn-success btn-sm"
                                                                disabled={actionLoading === req.id}
                                                                onClick={() => handleAction(req.id, () => handleAccept(req.id), 'Case accepted. Update capacity if this affects availability.')}
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                disabled={actionLoading === req.id}
                                                                onClick={() => handleAction(req.id, () => handleDecline(req.id), 'Case declined.')}
                                                            >
                                                                Decline
                                                            </button>
                                                            <select
                                                                className="inline-select"
                                                                value={declineReasons[req.id] || 'no_general_bed'}
                                                                onChange={(e) => setDeclineReasons({ ...declineReasons, [req.id]: e.target.value })}
                                                            >
                                                                <option value="no_general_bed">No general bed</option>
                                                                <option value="no_icu_bed">No ICU bed</option>
                                                                <option value="no_emergency_bed">No emergency bed</option>
                                                                <option value="no_ambulance">No ambulance</option>
                                                                <option value="staff_unavailable">Staff unavailable</option>
                                                                <option value="case_not_supported">Case not supported</option>
                                                                <option value="other">Other</option>
                                                            </select>
                                                            <input
                                                                className="inline-input"
                                                                value={acceptConditions[req.id] || ''}
                                                                onChange={(e) => setAcceptConditions({ ...acceptConditions, [req.id]: e.target.value })}
                                                                placeholder="Accept conditions"
                                                            />
                                                        </>
                                                    )}
                                                    {req.status === 'accepted' && (
                                                        <button
                                                            className="btn btn-info btn-sm"
                                                            disabled={actionLoading === req.id}
                                                            onClick={() => handleAction(req.id, reserveTransfer, 'Slot reserved.')}
                                                        >
                                                            Reserve
                                                        </button>
                                                    )}
                                                    <Link className="btn btn-outline btn-sm" to={`/placement-cases/${req.id}`}>
                                                        Details
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
