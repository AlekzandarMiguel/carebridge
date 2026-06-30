import React from 'react';
import AppIcon from './AppIcon';

export default function StatCard({ icon, label, value, color = 'blue' }) {
    return (
        <div className="stat-card">
            <div className={`stat-icon ${color}`}>
                {typeof icon === 'string' ? <AppIcon name={icon} /> : icon}
            </div>
            <div className="stat-info">
                <h3>{value}</h3>
                <p>{label}</p>
            </div>
        </div>
    );
}
