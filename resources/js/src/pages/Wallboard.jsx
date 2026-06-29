import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWallboard } from '../api/axios';
import StatusBadge from '../components/StatusBadge';

export default function Wallboard() {
    const [data, setData] = useState({ metrics: {}, cases: [] });
    const [loading, setLoading] = useState(true);

    const loadWallboard = async () => {
        try {
            const res = await getWallboard();
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWallboard();
        const interval = setInterval(loadWallboard, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="loading">Loading wallboard...</div>;

    const { metrics, cases } = data;

    return (
        <div>
            <div className="feature-hero wallboard-hero">
                <div>
                    <span>Realtime Operations</span>
                    <h2>Department Wallboard</h2>
                    <p>Live active rejected patient cases, assignment gaps, delivery movement, and risk signals.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{metrics.active_cases || 0}</strong><small>Active</small></div>
                    <div><strong>{metrics.needs_attention || 0}</strong><small>Attention</small></div>
                    <div><strong>{metrics.unassigned || 0}</strong><small>Unassigned</small></div>
                    <div><strong>{metrics.in_delivery || 0}</strong><small>In Delivery</small></div>
                </div>
            </div>

            <div className="wallboard-grid">
                {(cases || []).map((item) => (
                    <Link to={`/placement-cases/${item.id}`} className={`wallboard-card ${item.needs_attention ? 'needs-attention' : ''}`} key={item.id}>
                        <div className="flex-between">
                            <strong>{item.patient_reference_code}</strong>
                            <StatusBadge status={item.status} />
                        </div>
                        <p>{item.sending_hospital?.name} to {item.receiving_hospital?.name}</p>
                        <div className="board-card-meta">
                            <span className={`urgency-${item.urgency_level}`}>{item.urgency_level}</span>
                            <small>{item.case_type}</small>
                            <small>{item.waiting_minutes} min waiting</small>
                        </div>
                        <div className="wallboard-route">
                            <span>{item.route_distance_km || '-'} km</span>
                            <span>{item.estimated_travel_minutes || '-'} min ETA</span>
                        </div>
                        <div className="assignment-strip">
                            <small>Dispatcher</small>
                            <strong>{item.assigned_dispatcher?.name || 'Unassigned'}</strong>
                        </div>
                        <div className="board-location">{item.delivery_last_location || 'No movement yet'}</div>
                        {item.needs_attention && (
                            <span className={`sla-banner sla-${item.sla_state || item.delivery_eta_state}`}>
                                {item.sla_state === 'breached' ? 'SLA breached' : item.delivery_eta_state === 'late' ? 'ETA late' : 'Needs attention'}
                            </span>
                        )}
                    </Link>
                ))}
                {(cases || []).length === 0 && (
                    <div className="empty-state"><p>No active cases on the wallboard.</p></div>
                )}
            </div>
        </div>
    );
}
