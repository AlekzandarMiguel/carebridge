import React, { useState, useEffect } from 'react';
import { getDashboard } from '../api/axios';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { getUser, roleLabel } from '../utils/roles';

const roleDashboard = {
    sending_staff: {
        title: 'Rejected Case Intake',
        subtitle: 'Submit rejected patient cases, monitor placement, and start delivery after capacity is reserved.',
        cards: ['total_requests', 'pending_requests', 'accepted_requests', 'in_transfer', 'en_route_patients', 'completed_requests', 'declined_requests'],
    },
    receiving_staff: {
        title: 'Acceptance Desk',
        subtitle: 'Review rejected patient cases, reserve capacity, confirm arrivals, and complete handoffs.',
        cards: ['pending_requests', 'accepted_requests', 'in_transfer', 'arrived_patients', 'completed_requests', 'declined_requests'],
    },
    coordinator: {
        title: 'Department Dispatcher Dashboard',
        subtitle: 'Monitor rejected patient placement and delivery pressure without changing hospital actions.',
        cards: ['total_requests', 'waiting_patients', 'delayed_cases', 'unassigned_cases', 'assigned_cases', 'in_transfer', 'completed_requests'],
    },
    dispatcher: {
        title: 'Delivery Dispatcher Dashboard',
        subtitle: 'Assign active cases, watch route estimates, and keep rejected patient delivery updates moving.',
        cards: ['waiting_patients', 'unassigned_cases', 'assigned_cases', 'in_transfer', 'en_route_patients', 'delayed_cases', 'avg_travel_minutes'],
    },
    admin: {
        title: 'Department Admin Dashboard',
        subtitle: 'Review department-wide activity while managing configuration separately.',
        cards: ['total_requests', 'waiting_patients', 'assigned_cases', 'completed_requests', 'declined_requests'],
    },
};

const statCards = {
    total_requests: { icon: 'ALL', label: 'Total Cases', color: 'blue' },
    pending_requests: { icon: '...', label: 'Pending', color: 'yellow' },
    accepted_requests: { icon: 'OK', label: 'Accepted', color: 'cyan' },
    in_transfer: { icon: 'DT', label: 'In Delivery', color: 'blue' },
    en_route_patients: { icon: 'GO', label: 'Patients En Route', color: 'cyan' },
    arrived_patients: { icon: 'IN', label: 'Patients Arrived', color: 'yellow' },
    completed_requests: { icon: 'DONE', label: 'Completed', color: 'green' },
    declined_requests: { icon: 'NO', label: 'Declined', color: 'red' },
    waiting_patients: { icon: 'WAIT', label: 'Waiting Patients', color: 'yellow' },
    delayed_cases: { icon: 'SLA', label: 'Delayed Cases', color: 'red' },
    assigned_cases: { icon: 'ASG', label: 'Assigned Cases', color: 'green' },
    unassigned_cases: { icon: 'OPEN', label: 'Unassigned Cases', color: 'blue' },
    avg_travel_minutes: { icon: 'ETA', label: 'Avg Travel Min', color: 'cyan' },
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await getDashboard();
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading dashboard...</div>;
    if (!data) return <div className="empty-state"><p>Unable to load dashboard data.</p></div>;

    const { stats, recent_requests } = data;
    const user = getUser();
    const dashboard = roleDashboard[user.role] || {
        title: `${roleLabel(user.role)} Dashboard`,
        subtitle: 'Review your assigned placement and delivery workspace.',
        cards: Object.keys(statCards),
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div>
            <div className="page-heading-row">
                <div>
                    <h2>{dashboard.title}</h2>
                    <p>{dashboard.subtitle}</p>
                </div>
            </div>

            <div className="stats-grid">
                {dashboard.cards.map((key) => (
                    <StatCard
                        key={key}
                        icon={statCards[key].icon}
                        label={statCards[key].label}
                        value={stats[key]}
                        color={statCards[key].color}
                    />
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="summary-card">
                    <h3>{stats.success_rate}%</h3>
                    <p>Success Rate</p>
                </div>
                <div className="summary-card">
                    <h3>{stats.total_requests > 0 ? Math.round(stats.completed_requests / stats.total_requests * 100) : 0}%</h3>
                    <p>Completion Rate</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">Recent Rejected Patient Cases</div>
                <div className="card-body">
                    {recent_requests.length === 0 ? (
                        <div className="empty-state">
                            <p>No rejected patient cases yet.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>From</th>
                                        <th>To</th>
                                        <th>Urgency</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent_requests.map((req) => (
                                        <tr key={req.id}>
                                            <td><strong>{req.patient_reference_code}</strong></td>
                                            <td>{req.sending_hospital?.name}</td>
                                            <td>{req.receiving_hospital?.name || '-'}</td>
                                            <td className={`urgency-${req.urgency_level}`}>
                                                {req.urgency_level}
                                            </td>
                                            <td><StatusBadge status={req.status} /></td>
                                            <td>{formatDate(req.created_at)}</td>
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
