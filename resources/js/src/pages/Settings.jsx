import React, { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api/axios';

export default function Settings() {
    const defaultNotificationPrefs = {
        sla_breach: true,
        assigned_case: true,
        arrival: true,
        completed_delivery: true,
        declined_case: true,
    };
    const [data, setData] = useState(null);
    const [form, setForm] = useState({
        name: '',
        email: '',
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [notificationPrefs, setNotificationPrefs] = useState(() => {
        try {
            return {
                ...defaultNotificationPrefs,
                ...JSON.parse(localStorage.getItem('carebridge_notification_preferences') || '{}'),
            };
        } catch (e) {
            return defaultNotificationPrefs;
        }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await getSettings();
            setData(res.data);
            setForm({
                name: res.data.user.name || '',
                email: res.data.user.email || '',
                current_password: '',
                password: '',
                password_confirmation: '',
            });
        } catch (err) {
            setError('Unable to load settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccess('');
        setError('');

        try {
            const payload = { ...form };
            if (!payload.password) {
                delete payload.current_password;
                delete payload.password;
                delete payload.password_confirmation;
            }

            const res = await updateSettings(payload);
            setData(res.data);
            localStorage.setItem('carebridge_user', JSON.stringify(res.data.user));
            setForm({
                name: res.data.user.name || '',
                email: res.data.user.email || '',
                current_password: '',
                password: '',
                password_confirmation: '',
            });
            setSuccess(res.data.message);
        } catch (err) {
            const validation = err.response?.data?.errors;
            setError(validation ? Object.values(validation).flat().join(' ') : err.response?.data?.message || 'Unable to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const toggleNotificationPref = (key) => {
        const next = { ...notificationPrefs, [key]: !notificationPrefs[key] };
        setNotificationPrefs(next);
        localStorage.setItem('carebridge_notification_preferences', JSON.stringify(next));
        setSuccess('Notification preferences saved on this device.');
    };

    if (loading) return <div className="loading">Loading settings...</div>;
    if (!data) return <div className="empty-state"><p>Unable to load settings.</p></div>;

    const { user, role_settings } = data;

    return (
        <div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Settings</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '24px' }}>
                Manage your account and review permissions for your role.
            </p>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="settings-grid">
                <div className="card">
                    <div className="card-header">Profile</div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input name="name" value={form.name} onChange={handleChange} required />
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" name="email" value={form.email} onChange={handleChange} required />
                            </div>

                            <div className="form-group">
                                <label>Current Password</label>
                                <input type="password" name="current_password" value={form.current_password} onChange={handleChange} placeholder="Required only when changing password" />
                            </div>

                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" name="password" value={form.password} onChange={handleChange} minLength={8} />
                            </div>

                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} minLength={8} />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">Role Settings</div>
                    <div className="card-body">
                        <div className="role-panel">
                            <div>
                                <span className="role-label">{role_settings.label}</span>
                                <h3>{user.hospital?.name || 'System-wide access'}</h3>
                                <p>Default home: {role_settings.home}</p>
                            </div>
                        </div>

                        <div className="settings-list">
                            {role_settings.permissions.map((permission) => (
                                <div className="settings-list-item" key={permission}>
                                    <span>OK</span>
                                    <p>{permission}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">Notification Preferences</div>
                    <div className="card-body">
                        <div className="settings-list">
                            {[
                                ['sla_breach', 'SLA breach and long-wait alerts'],
                                ['assigned_case', 'Assigned case alerts'],
                                ['arrival', 'Patient arrival alerts'],
                                ['completed_delivery', 'Completed delivery alerts'],
                                ['declined_case', 'Declined case and reroute alerts'],
                            ].map(([key, label]) => (
                                <label className="settings-list-item preference-row" key={key}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(notificationPrefs[key])}
                                        onChange={() => toggleNotificationPref(key)}
                                    />
                                    <p>{label}</p>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
