import React from 'react';

export default function StatCard({ icon, label, value, color = 'blue' }) {
    return (
        <div className="stat-card">
            <div className={`stat-icon ${color}`}>{icon}</div>
            <div className="stat-info">
                <h3>{value}</h3>
                <p>{label}</p>
            </div>
        </div>
    );
}
