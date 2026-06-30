import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../api/axios';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { getUser, roleLabel, roleProfile } from '../utils/roles';

const roleDashboard = {
    sending_staff: {
        title: 'Rejected Case Intake',
        subtitle: 'Submit rejected patient cases, monitor placement, and start delivery after capacity is reserved.',
        cards: ['total_requests', 'pending_requests', 'accepted_requests', 'in_transfer', 'en_route_patients', 'completed_requests', 'declined_requests'],
        focus: 'Intake lane',
        recentTitle: 'Recent Cases You Started',
        quickActions: [
            ['Create rejected case', '/intake'],
            ['Track active cases', '/placement-tracking'],
            ['Find accepting hospital', '/hospital-directory'],
        ],
    },
    receiving_staff: {
        title: 'Acceptance Desk',
        subtitle: 'Review rejected patient cases, reserve capacity, confirm arrivals, and complete handoffs.',
        cards: ['pending_requests', 'accepted_requests', 'in_transfer', 'arrived_patients', 'completed_requests', 'declined_requests'],
        focus: 'Acceptance lane',
        recentTitle: 'Recent Requests Sent To You',
        quickActions: [
            ['Open acceptance queue', '/incoming-requests'],
            ['Update own capacity', '/hospital-capacity'],
            ['Review handoffs', '/placement-tracking'],
        ],
    },
    coordinator: {
        title: 'Coordinator Command Dashboard',
        subtitle: 'Monitor rejected patient placement and delivery pressure without changing hospital actions.',
        cards: ['total_requests', 'waiting_patients', 'delayed_cases', 'unassigned_cases', 'assigned_cases', 'in_transfer', 'completed_requests'],
        focus: 'Oversight lane',
        recentTitle: 'Recent Department Cases',
        quickActions: [
            ['Open command view', '/coordinator-board'],
            ['Watch wallboard', '/wallboard'],
            ['Review audit logs', '/audit-logs'],
        ],
    },
    dispatcher: {
        title: 'Delivery Dispatcher Dashboard',
        subtitle: 'Assign active cases, watch route estimates, and keep rejected patient delivery updates moving.',
        cards: ['waiting_patients', 'unassigned_cases', 'assigned_cases', 'in_transfer', 'en_route_patients', 'delayed_cases', 'avg_travel_minutes'],
        focus: 'Delivery lane',
        recentTitle: 'Recent Delivery Cases',
        quickActions: [
            ['Open dispatcher board', '/dispatcher-board'],
            ['Watch wallboard', '/wallboard'],
            ['Check placement directory', '/hospital-directory'],
        ],
    },
    admin: {
        title: 'Department Admin Dashboard',
        subtitle: 'Review department-wide activity while managing configuration separately.',
        cards: ['total_requests', 'waiting_patients', 'assigned_cases', 'completed_requests', 'declined_requests'],
        focus: 'Governance lane',
        recentTitle: 'Recent System Cases',
        quickActions: [
            ['Manage users and roles', '/admin'],
            ['Open command view', '/coordinator-board'],
            ['Review audit logs', '/audit-logs'],
        ],
    },
};

const statCards = {
    total_requests: { icon: 'cases', label: 'Total Cases', color: 'blue' },
    pending_requests: { icon: 'pending', label: 'Pending', color: 'yellow' },
    accepted_requests: { icon: 'accepted', label: 'Accepted', color: 'cyan' },
    in_transfer: { icon: 'ambulance', label: 'In Delivery', color: 'blue' },
    en_route_patients: { icon: 'route', label: 'Patients En Route', color: 'cyan' },
    arrived_patients: { icon: 'arrived', label: 'Patients Arrived', color: 'yellow' },
    completed_requests: { icon: 'completed', label: 'Completed', color: 'green' },
    declined_requests: { icon: 'declined', label: 'Declined', color: 'red' },
    waiting_patients: { icon: 'waiting', label: 'Waiting Patients', color: 'yellow' },
    delayed_cases: { icon: 'delayed', label: 'Delayed Cases', color: 'red' },
    assigned_cases: { icon: 'assigned', label: 'Assigned Cases', color: 'green' },
    unassigned_cases: { icon: 'unassigned', label: 'Unassigned Cases', color: 'blue' },
    avg_travel_minutes: { icon: 'eta', label: 'Avg Travel Min', color: 'cyan' },
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
        focus: 'Workspace',
        recentTitle: 'Recent Cases',
        quickActions: [],
    };
    const profile = roleProfile(user.role);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div>
            <div className="role-workbench">
                <section className="role-purpose-panel">
                    <div className="role-purpose-copy">
                        <span>Your responsibility</span>
                        <h3>{profile.label}</h3>
                        <p>{profile.purpose}</p>
                    </div>
                    <div className="role-boundary-block">
                        <strong>Limits</strong>
                        <div className="role-boundary-list">
                            {profile.boundaries.slice(0, 3).map((item) => (
                                <span key={item}>{item}</span>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="quick-action-panel">
                    <span>Primary work</span>
                    <div className="quick-action-grid">
                        {dashboard.quickActions.map(([label, path]) => (
                            <Link to={path} key={path}>{label}</Link>
                        ))}
                    </div>
                </section>
            </div>

            <div className={`stats-grid dashboard-stats-strip dashboard-stats-count-${dashboard.cards.length}`}>
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
                <div className="card-header">{dashboard.recentTitle}</div>
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
