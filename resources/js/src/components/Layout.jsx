import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getNotifications, logout } from '../api/axios';
import { getUser, roleCanAccess, roleLabel } from '../utils/roles';
import ThemeToggle from './ThemeToggle';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'DB' },
    { path: '/hospital-capacity', label: 'Hospital Capacity', icon: 'HC', roles: ['receiving_staff'] },
    { path: '/create-transfer', label: 'Create Transfer', icon: '+', roles: ['sending_staff'] },
    { path: '/incoming-requests', label: 'Incoming Requests', icon: 'IN', roles: ['receiving_staff'] },
    { path: '/transfer-tracking', label: 'Transfer Tracking', icon: 'TR' },
    { path: '/coordinator-board', label: 'Command View', icon: 'CV', roles: ['coordinator', 'admin'] },
    { path: '/hospital-directory', label: 'Directory', icon: 'HD', roles: ['sending_staff', 'coordinator', 'admin'] },
    { path: '/analytics', label: 'Analytics', icon: 'AN', roles: ['coordinator', 'admin'] },
    { path: '/admin', label: 'Admin', icon: 'AD', roles: ['admin'] },
    { path: '/audit-logs', label: 'Audit Logs', icon: 'AL', roles: ['admin'] },
    { path: '/settings', label: 'Settings', icon: 'ST' },
];

const notificationLabels = {
    created: 'Created',
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    reserved: 'Reserved',
    in_transfer: 'In Transfer',
    patient_arrived: 'Patient Arrived',
    escalated: 'Escalated',
    coordinator_note: 'Coordinator Note',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export default function Layout({ children, theme, toggleTheme }) {
    const navigate = useNavigate();
    const user = getUser();
    const roleClass = `role-${user.role || 'unknown'}`;
    const currentRoleLabel = roleLabel(user.role);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');

    useEffect(() => {
        const loadNotifications = () => getNotifications()
            .then((res) => setNotifications(res.data.notifications || []))
            .catch(() => setNotifications([]));
        loadNotifications();
        const interval = setInterval(loadNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (e) {
            // Ignore logout errors so the local session can still be cleared.
        }
        localStorage.removeItem('carebridge_token');
        localStorage.removeItem('carebridge_user');
        navigate('/');
    };

    const handleGlobalSearch = (event) => {
        event.preventDefault();
        const value = globalSearch.trim();
        navigate(value ? `/transfer-tracking?q=${encodeURIComponent(value)}` : '/transfer-tracking');
    };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <img className="sidebar-brand-logo" src="/images/carebridge-logo.svg" alt="CareBridge" />
                </div>
                <nav className="sidebar-nav">
                    {navItems.filter((item) => roleCanAccess(user.role, item.roles)).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className={`sidebar-user-card ${roleClass}`}>
                        <span className="sidebar-role-light" aria-hidden="true"></span>
                        <strong>{user.name || 'User'}</strong>
                        <small>{user.hospital?.name || 'Hospital workspace'}</small>
                    </div>
                    <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{ width: '100%' }}>
                        Logout
                    </button>
                </div>
            </aside>
            <main className="main-content">
                <header className="topbar">
                    <div>
                        <div className="topbar-eyebrow">Care Network</div>
                        <div className="topbar-title">Hospital Capacity Coordination</div>
                    </div>
                    <form className="topbar-search" onSubmit={handleGlobalSearch}>
                        <input
                            value={globalSearch}
                            onChange={(event) => setGlobalSearch(event.target.value)}
                            placeholder="Search transfers..."
                            aria-label="Search transfers"
                        />
                    </form>
                    <div className="topbar-actions">
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <div className="notification-menu">
                            <button type="button" className="theme-toggle" onClick={() => setShowNotifications(!showNotifications)}>
                                <span>Alerts</span>
                            </button>
                            {showNotifications && (
                                <div className="notification-popover">
                                    <strong>Recent Activity</strong>
                                    {notifications.length === 0 ? (
                                        <p>No recent alerts.</p>
                                    ) : notifications.slice(0, 6).map((item) => (
                                        <div key={item.id}>
                                            <span className={`badge badge-${item.action || 'pending'} notification-status`}>
                                                {notificationLabels[item.action] || item.action?.replace('_', ' ') || 'Update'}
                                            </span>
                                            <small>{item.transfer_request?.patient_reference_code} - {item.remarks}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={`topbar-user ${roleClass}`}>
                            <strong>{user.name}</strong>
                            <span>{currentRoleLabel}</span>
                        </div>
                    </div>
                </header>
                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
