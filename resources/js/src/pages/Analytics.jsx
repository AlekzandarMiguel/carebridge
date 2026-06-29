import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../api/axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#f59e0b', '#0891b2', '#dc2626', '#7c3aed', '#2563eb', '#16a34a', '#6b7280'];

export default function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await getAnalytics();
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading analytics...</div>;
    if (!data) return <div className="empty-state"><p>Unable to load analytics.</p></div>;

    const { status_distribution, urgency_distribution, case_type_distribution, decline_reason_distribution, transfers_over_time, hospital_stats, hospital_pressure, assignment_stats, summary } = data;

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div>
            <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Department Analytics</h2>

            {/* Summary Cards */}
            <div className="summary-grid">
                <div className="summary-card">
                    <h3>{summary.total_requests}</h3>
                    <p>Total Rejected Cases</p>
                </div>
                <div className="summary-card">
                    <h3>{summary.completed_requests}</h3>
                    <p>Completed</p>
                </div>
                <div className="summary-card">
                    <h3>{summary.success_rate}%</h3>
                    <p>Placement Success Rate</p>
                </div>
                <div className="summary-card">
                    <h3>{summary.avg_coordination_time_minutes}</h3>
                    <p>Avg Placement Time (min)</p>
                </div>
                <div className="summary-card">
                    <h3>{summary.avg_delivery_time_minutes}</h3>
                    <p>Avg Delivery Time (min)</p>
                </div>
                <div className="summary-card">
                    <h3>{summary.sla_breach_rate}%</h3>
                    <p>SLA Breach Rate</p>
                </div>
                <div className="summary-card">
                    <h3>{assignment_stats?.unassigned_active || 0}</h3>
                    <p>Unassigned Active Cases</p>
                </div>
                <div className="summary-card">
                    <h3>{assignment_stats?.avg_travel_minutes || 0}</h3>
                    <p>Avg Route ETA (min)</p>
                </div>
            </div>

            {/* Charts */}
            <div className="analytics-grid">
                {/* Status Distribution */}
                <div className="analytics-card">
                    <h3>Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={status_distribution}
                                dataKey="count"
                                nameKey="status"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ status, count }) => `${status}: ${count}`}
                            >
                                {status_distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Urgency Distribution */}
                <div className="analytics-card">
                    <h3>Urgency Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={urgency_distribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="urgency_level" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Case Type Distribution */}
                <div className="analytics-card">
                    <h3>Case Type Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={case_type_distribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="case_type" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Placement Cases Over Time */}
                <div className="analytics-card">
                    <h3>Rejected Cases Over Time (Last 7 Days)</h3>
                    {transfers_over_time.length === 0 ? (
                        <div className="empty-state"><p>No data for the last 7 days.</p></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={transfers_over_time}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={formatDate} />
                                <YAxis allowDecimals={false} />
                                <Tooltip labelFormatter={formatDate} />
                                <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="analytics-card">
                    <h3>Rejection Reasons</h3>
                    {!decline_reason_distribution || decline_reason_distribution.length === 0 ? (
                        <div className="empty-state"><p>No declined requests recorded yet.</p></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={decline_reason_distribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="decline_reason_category" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Hospital Stats Table */}
            <div className="card mt-24">
                <div className="card-header">Top Hospitals by Rejected Case Volume</div>
                <div className="card-body">
                    {hospital_stats.length === 0 ? (
                        <div className="empty-state"><p>No rejected patient case data yet.</p></div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Hospital</th>
                                        <th>Total Cases</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hospital_stats.map((hs, i) => (
                                        <tr key={i}>
                                            <td><strong>{hs.hospital_name}</strong></td>
                                            <td>{hs.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="card mt-24">
                <div className="card-header">Current Hospital Pressure</div>
                <div className="card-body">
                    {!hospital_pressure || hospital_pressure.length === 0 ? (
                        <div className="empty-state"><p>No hospital capacity data yet.</p></div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Hospital</th>
                                        <th>Open Beds</th>
                                        <th>Ambulances</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hospital_pressure.map((hospital, i) => (
                                        <tr key={i}>
                                            <td><strong>{hospital.hospital_name}</strong></td>
                                            <td>{hospital.open_beds}</td>
                                            <td>{hospital.ambulances}</td>
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
