import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTransferTracking, reserveTransfer, startTransfer, markPatientArrived, completeTransfer, cancelTransfer, exportTransferRequests, downloadBlob } from '../api/axios';
import StatusBadge from '../components/StatusBadge';

const deliveryLabels = {
    not_started: 'Not Started',
    en_route: 'En Route',
    arrived: 'Arrived',
    delivered: 'Delivered',
};

export default function TransferTracking() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchParams, setSearchParams] = useSearchParams();
    const [filters, setFilters] = useState({
        q: searchParams.get('q') || '',
        status: searchParams.get('status') || '',
        urgency_level: searchParams.get('urgency_level') || '',
        case_type: searchParams.get('case_type') || '',
        delivery_status: searchParams.get('delivery_status') || '',
    });
    const user = JSON.parse(localStorage.getItem('carebridge_user') || '{}');

    useEffect(() => {
        fetchTracking();
    }, [currentPage, filters]);

    useEffect(() => {
        setFilters({
            q: searchParams.get('q') || '',
            status: searchParams.get('status') || '',
            urgency_level: searchParams.get('urgency_level') || '',
            case_type: searchParams.get('case_type') || '',
            delivery_status: searchParams.get('delivery_status') || '',
        });
        setCurrentPage(1);
    }, [searchParams]);

    useEffect(() => {
        const interval = setInterval(fetchTracking, 10000);
        return () => clearInterval(interval);
    }, [currentPage, filters]);

    const fetchTracking = async () => {
        try {
            const res = await getTransferTracking(currentPage, filters);
            setData(res.data.transfer_requests);
        } catch (err) {
            console.error(err);
            setError('Unable to load transfer tracking.');
        } finally {
            setLoading(false);
        }
    };

    const updateFilter = (key, value) => {
        const nextFilters = { ...filters, [key]: value };
        setCurrentPage(1);
        setFilters(nextFilters);
        setSearchParams(Object.fromEntries(Object.entries(nextFilters).filter(([, filterValue]) => filterValue)));
    };

    const clearFilters = () => {
        const nextFilters = { q: '', status: '', urgency_level: '', case_type: '', delivery_status: '' };
        setCurrentPage(1);
        setFilters(nextFilters);
        setSearchParams({});
    };

    const handleExport = async () => {
        setError('');
        try {
            const res = await exportTransferRequests(filters);
            downloadBlob(res.data, 'carebridge-transfer-report.csv');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to export transfer report.');
        }
    };

    const handleAction = async (id, actionFn, successMsg) => {
        setActionLoading(id);
        setError('');
        setSuccess('');
        try {
            await actionFn(id);
            setSuccess(successMsg);
            fetchTracking();
        } catch (err) {
            if (err.message !== 'Action cancelled.') {
                setError(err.response?.data?.message || 'Action failed.');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const confirmAction = (message, actionFn) => (id) => {
        if (!window.confirm(message)) {
            return Promise.reject(new Error('Action cancelled.'));
        }

        return actionFn(id);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';

        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const deliveryStatus = (req) => req.delivery_status || 'not_started';

    const canActAsReceiving = (req) => user.role === 'receiving_staff' && req.receiving_hospital_id === user.hospital_id;
    const canActAsSending = (req) => user.role === 'sending_staff' && req.sending_hospital_id === user.hospital_id;
    const rows = data?.data || [];
    const outboundWaiting = rows.filter((req) => canActAsSending(req) && ['pending', 'accepted', 'reserved'].includes(req.status)).length;
    const declinedOutbound = rows.filter((req) => canActAsSending(req) && req.status === 'declined').length;
    const inMovement = rows.filter((req) => req.status === 'in_transfer').length;
    const minutesUntil = (value) => value ? Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 60000)) : null;

    if (loading) return <div className="loading">Loading transfer tracking...</div>;

    return (
        <div>
            <div className="feature-hero">
                <div>
                    <span>{user.role === 'sending_staff' ? 'Outbound Queue' : 'Transfer Monitoring'}</span>
                    <h2>Transfer Tracking</h2>
                    <p>Track patient movement, reservation timers, and transfer outcomes. Auto-refreshes every 10 seconds.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{outboundWaiting}</strong><small>Waiting</small></div>
                    <div><strong>{inMovement}</strong><small>In transfer</small></div>
                    <div><strong>{declinedOutbound}</strong><small>Need reroute</small></div>
                </div>
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="directory-toolbar advanced-filter-bar">
                <div className="form-grid tracking-filter-grid">
                    <div className="form-group">
                        <input value={filters.q} onChange={(e) => updateFilter('q', e.target.value)} placeholder="Search reference, hospital, reason..." />
                    </div>
                    <div className="form-group">
                        <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                            <option value="">All statuses</option>
                            {['pending', 'accepted', 'reserved', 'in_transfer', 'completed', 'declined', 'cancelled'].map((status) => (
                                <option value={status} key={status}>{status.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <select value={filters.delivery_status} onChange={(e) => updateFilter('delivery_status', e.target.value)}>
                            <option value="">All delivery</option>
                            <option value="not_started">Not started</option>
                            <option value="en_route">En route</option>
                            <option value="arrived">Arrived</option>
                            <option value="delivered">Delivered</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <select value={filters.urgency_level} onChange={(e) => updateFilter('urgency_level', e.target.value)}>
                            <option value="">All urgency</option>
                            <option value="normal">Normal</option>
                            <option value="urgent">Urgent</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <select value={filters.case_type} onChange={(e) => updateFilter('case_type', e.target.value)}>
                            <option value="">All case types</option>
                            <option value="general">General</option>
                            <option value="emergency">Emergency</option>
                            <option value="icu">ICU</option>
                        </select>
                    </div>
                </div>
                <div className="action-buttons">
                    {['coordinator', 'admin'].includes(user.role) && <button className="btn btn-primary btn-sm" onClick={handleExport}>Export CSV</button>}
                    <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear</button>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    {!data || data.data.length === 0 ? (
                        <div className="empty-state">
                            <p>No transfer requests found.</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Reference</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Case</th>
                                            <th>Urgency</th>
                                            <th>Status</th>
                                            <th>Patient Delivery</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.data.map((req) => (
                                            <tr key={req.id}>
                                                <td><strong>{req.patient_reference_code}</strong></td>
                                                <td>{req.sending_hospital?.name}</td>
                                                <td>{req.receiving_hospital?.name || '-'}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{req.case_type}</td>
                                                <td className={`urgency-${req.urgency_level}`}>
                                                    {req.urgency_level}
                                                </td>
                                                <td><StatusBadge status={req.status} /></td>
                                                <td>
                                                    <div className="delivery-monitor">
                                                        <div className="delivery-monitor-head">
                                                            <span className={`delivery-dot delivery-${deliveryStatus(req)}`}></span>
                                                            <strong>{deliveryLabels[deliveryStatus(req)]}</strong>
                                                        </div>
                                                        <span>{req.delivery_last_location || 'Waiting for departure'}</span>
                                                        <small>
                                                            Departed: {formatDate(req.delivery_started_at)}
                                                        </small>
                                                        <small>
                                                            Arrived: {formatDate(req.patient_arrived_at)}
                                                        </small>
                                                        {req.reserved_until && (
                                                            <small>Reserve expires: {minutesUntil(req.reserved_until)} min</small>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{formatDate(req.created_at)}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {req.status === 'accepted' && canActAsReceiving(req) && (
                                                            <button
                                                                className="btn btn-info btn-sm"
                                                                disabled={actionLoading === req.id}
                                                                onClick={() => handleAction(req.id, confirmAction('Reserve this bed for the patient?', reserveTransfer), 'Slot reserved.')}
                                                            >
                                                                Reserve
                                                            </button>
                                                        )}
                                                        {req.status === 'reserved' && canActAsSending(req) && (
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                disabled={actionLoading === req.id}
                                                                onClick={() => handleAction(req.id, confirmAction('Start patient delivery now?', startTransfer), 'Transfer started.')}
                                                            >
                                                                Start Transfer
                                                            </button>
                                                        )}
                                                        {req.status === 'in_transfer' && canActAsReceiving(req) && (
                                                            <>
                                                                {deliveryStatus(req) !== 'arrived' && (
                                                                    <button
                                                                        className="btn btn-info btn-sm"
                                                                        disabled={actionLoading === req.id}
                                                                        onClick={() => handleAction(req.id, markPatientArrived, 'Patient arrival recorded.')}
                                                                    >
                                                                        Mark Arrived
                                                                    </button>
                                                                )}
                                                                {deliveryStatus(req) === 'arrived' && (
                                                                    <button
                                                                        className="btn btn-success btn-sm"
                                                                        disabled={actionLoading === req.id}
                                                                        onClick={() => handleAction(req.id, completeTransfer, 'Patient delivery completed.')}
                                                                    >
                                                                        Complete Delivery
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        {['pending', 'accepted', 'reserved'].includes(req.status) && canActAsSending(req) && (
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                disabled={actionLoading === req.id}
                                                                onClick={() => handleAction(req.id, confirmAction('Cancel this request?', cancelTransfer), 'Cancelled.')}
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                        {req.status === 'declined' && canActAsSending(req) && (
                                                            <Link className="btn btn-warning btn-sm" to={`/create-transfer?from=${req.id}`}>
                                                                Reroute
                                                            </Link>
                                                        )}
                                                        <Link className="btn btn-outline btn-sm" to={`/transfer-requests/${req.id}`}>
                                                            Details
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {data.last_page > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        disabled={currentPage <= 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                    >
                                        Previous
                                    </button>
                                    <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--gray-500)' }}>
                                        Page {currentPage} of {data.last_page}
                                    </span>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        disabled={currentPage >= data.last_page}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
