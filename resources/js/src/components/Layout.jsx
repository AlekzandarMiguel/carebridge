import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getNotifications, logout, markAllNotificationsRead, markNotificationRead } from '../api/axios';
import { getUser, roleCanAccess, roleLabel } from '../utils/roles';
import ThemeToggle from './ThemeToggle';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'DB' },
    { path: '/hospital-capacity', label: 'Capacity Desk', icon: 'HC', roles: ['receiving_staff'] },
    { path: '/create-transfer', label: 'Rejected Intake', icon: '+', roles: ['sending_staff'] },
    { path: '/incoming-requests', label: 'Acceptance Queue', icon: 'IN', roles: ['receiving_staff'] },
    { path: '/transfer-tracking', label: 'Case Tracking', icon: 'CT', roles: ['sending_staff', 'receiving_staff'] },
    { path: '/transfer-tracking', label: 'Delivery Board', icon: 'DT', roles: ['dispatcher', 'coordinator', 'admin'] },
    { path: '/coordinator-board', label: 'Command View', icon: 'CV', roles: ['coordinator', 'admin'] },
    { path: '/wallboard', label: 'Wallboard', icon: 'WB', roles: ['coordinator', 'dispatcher', 'admin'] },
    { path: '/hospital-directory', label: 'Placement Directory', icon: 'PD', roles: ['sending_staff', 'coordinator', 'dispatcher', 'admin'] },
    { path: '/analytics', label: 'Analytics', icon: 'AN', roles: ['coordinator', 'dispatcher', 'admin'] },
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
    assigned: 'Assigned',
    route_updated: 'Route Updated',
    delivery_update: 'Delivery Update',
    attachment_uploaded: 'Attachment Uploaded',
    attachment_removed: 'Attachment Removed',
    archived: 'Archived',
    unarchived: 'Restored',
};

export default function Layout({ children, theme, toggleTheme }) {
    const navigate = useNavigate();
    const user = getUser();
    const roleClass = `role-${user.role || 'unknown'}`;
    const currentRoleLabel = roleLabel(user.role);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');

    useEffect(() => {
        const loadNotifications = () => getNotifications()
            .then((res) => {
                setNotifications(res.data.notifications || []);
                setUnreadCount(res.data.unread_count || 0);
            })
            .catch(() => {
                setNotifications([]);
                setUnreadCount(0);
            });
        loadNotifications();
        const interval = setInterval(loadNotifications, 5000);
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

    const handleMarkRead = async (id) => {
        try {
            await markNotificationRead(id);
            setNotifications((items) => items.map((item) => item.id === id ? { ...item, is_read: true } : item));
            setUnreadCount((count) => Math.max(0, count - 1));
        } catch (e) {
            // Keep the alert visible if the server rejects the update.
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
            setUnreadCount(0);
        } catch (e) {
            // Keep current read state if the request fails.
        }
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
                    {navItems.filter((item) => roleCanAccess(user.role, item.roles)).map((item, index) => (
                        <NavLink
                            key={`${item.path}-${index}`}
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
                        <div className="topbar-eyebrow">Placement Department</div>
                        <div className="topbar-title">Rejected Patient Placement and Delivery</div>
                    </div>
                    <form className="topbar-search" onSubmit={handleGlobalSearch}>
                        <input
                            value={globalSearch}
                            onChange={(event) => setGlobalSearch(event.target.value)}
                            placeholder="Search rejected cases..."
                            aria-label="Search rejected patient cases"
                        />
                    </form>
                    <div className="topbar-actions">
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <div className="notification-menu">
                            <button type="button" className="theme-toggle" onClick={() => setShowNotifications(!showNotifications)}>
                                <span>Alerts</span>
                                {unreadCount > 0 && <em className="alert-count">{unreadCount}</em>}
                            </button>
                            {showNotifications && (
                                <div className="notification-popover">
                                    <div className="notification-popover-head">
                                        <strong>Recent Activity</strong>
                                        {unreadCount > 0 && <button type="button" onClick={handleMarkAllRead}>Mark all read</button>}
                                    </div>
                                    {notifications.length === 0 ? (
                                        <p>No recent alerts.</p>
                                    ) : notifications.slice(0, 6).map((item) => (
                                        <div key={item.id} className={`notification-item priority-${item.priority || 'normal'} ${item.is_read ? 'is-read' : ''}`}>
                                            <span className={`badge badge-${item.action || 'pending'} notification-status`}>
                                                {notificationLabels[item.action] || item.action?.replace('_', ' ') || 'Update'}
                                                <small>{item.priority_label || 'Normal'}</small>
                                            </span>
                                            <small>{item.transfer_request?.patient_reference_code} - {item.remarks}</small>
                                            {!item.is_read && <button type="button" onClick={() => handleMarkRead(item.id)}>Mark read</button>}
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
