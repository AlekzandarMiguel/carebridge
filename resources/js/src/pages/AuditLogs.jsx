import React, { useEffect, useState } from 'react';
import { downloadBlob, exportAuditLogs, getAuditLogs } from '../api/axios';

export default function AuditLogs() {
    const [logs, setLogs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ action: '', role: '', q: '', from: '', to: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        getAuditLogs(page, filters)
            .then((res) => setLogs(res.data.audit_logs))
            .finally(() => setLoading(false));
    }, [page, filters]);

    const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';

    const handleExport = async () => {
        setError('');
        try {
            const res = await exportAuditLogs(filters);
            downloadBlob(res.data, 'carebridge-audit-logs.csv');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to export audit logs.');
        }
    };

    if (loading) return <div className="loading">Loading audit logs...</div>;

    return (
        <div>
            <div className="feature-hero">
                <div>
                    <span>Department Review</span>
                    <h2>Audit Logs</h2>
                    <p>Review rejected patient case actions, user activity, timestamps, and operational remarks.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{logs?.total || 0}</strong><small>Total logs</small></div>
                    <div><strong>{logs?.data?.length || 0}</strong><small>This page</small></div>
                    <div><strong>{logs?.current_page || 1}</strong><small>Page</small></div>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="directory-toolbar">
                <div className="form-grid audit-filter-grid">
                    <div className="form-group"><input placeholder="Search user, reference, remarks" value={filters.q} onChange={(e) => { setPage(1); setFilters({ ...filters, q: e.target.value }); }} /></div>
                    <div className="form-group">
                        <select value={filters.action} onChange={(e) => { setPage(1); setFilters({ ...filters, action: e.target.value }); }}>
                            <option value="">All actions</option>
                            {['created', 'accepted', 'declined', 'reserved', 'in_transfer', 'patient_arrived', 'completed', 'cancelled', 'escalated', 'coordinator_note'].map((action) => (
                                <option value={action} key={action}>{action.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <select value={filters.role} onChange={(e) => { setPage(1); setFilters({ ...filters, role: e.target.value }); }}>
                            <option value="">All roles</option>
                            <option value="sending_staff">Intake Staff</option>
                            <option value="receiving_staff">Acceptance Staff</option>
                            <option value="dispatcher">Dispatcher</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="form-group"><input type="date" value={filters.from} onChange={(e) => { setPage(1); setFilters({ ...filters, from: e.target.value }); }} /></div>
                    <div className="form-group"><input type="date" value={filters.to} onChange={(e) => { setPage(1); setFilters({ ...filters, to: e.target.value }); }} /></div>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-primary btn-sm" onClick={handleExport}>Export CSV</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setPage(1); setFilters({ action: '', role: '', q: '', from: '', to: '' }); }}>Clear</button>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    {!logs || logs.data.length === 0 ? (
                        <div className="empty-state"><p>No audit logs yet.</p></div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Action</th>
                                        <th>Reference</th>
                                        <th>User</th>
                                        <th>Placement Route</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.data.map((log) => (
                                        <tr key={log.id}>
                                            <td>{formatDate(log.created_at)}</td>
                                            <td><span className={`badge badge-${log.action}`}>{log.action?.replace('_', ' ')}</span></td>
                                            <td><strong>{log.transfer_request?.patient_reference_code || '-'}</strong></td>
                                            <td>{log.user?.name || 'System'}<br /><small>{log.user?.role?.replace('_', ' ') || '-'}</small></td>
                                            <td>{log.transfer_request?.sending_hospital?.name || '-'} to {log.transfer_request?.receiving_hospital?.name || '-'}</td>
                                            <td>{log.remarks || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {logs && logs.last_page > 1 && (
                        <div className="pagination-row">
                            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                            <span>Page {logs.current_page} of {logs.last_page}</span>
                            <button className="btn btn-outline btn-sm" disabled={page >= logs.last_page} onClick={() => setPage((current) => current + 1)}>Next</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
