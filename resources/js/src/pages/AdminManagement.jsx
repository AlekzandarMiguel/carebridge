import React, { useEffect, useState } from 'react';
import { createAdminHospital, createAdminUser, getAdminData, getSystemSettings, resetAdminUserPassword, updateAdminHospital, updateAdminUser, updateAdminUserStatus, updateSystemSettings } from '../api/axios';
import { roleLabel } from '../utils/roles';

const blankUser = { name: '', email: '', role: 'sending_staff', hospital_id: '', password: 'password123', account_status: 'approved' };
const blankHospital = { name: '', address: '', latitude: '', longitude: '', contact_number: '', transfer_contact_name: '', transfer_contact_phone: '', emergency_contact_name: '', emergency_contact_phone: '', status: 'active' };

export default function AdminManagement() {
    const [data, setData] = useState({ users: [], hospitals: [], admin_activity: [] });
    const [userForm, setUserForm] = useState(blankUser);
    const [hospitalForm, setHospitalForm] = useState(blankHospital);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editingHospitalId, setEditingHospitalId] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [settings, setSettings] = useState(null);
    const [activePanel, setActivePanel] = useState('users');

    const loadAdmin = async () => {
        try {
            const res = await getAdminData();
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load admin management.');
        }
    };

    useEffect(() => {
        loadAdmin();
        getSystemSettings().then((res) => setSettings(res.data.settings)).catch(() => {});
    }, []);

    const saveUser = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const payload = { ...userForm, hospital_id: userForm.hospital_id || null };
            if (editingUserId) {
                await updateAdminUser(editingUserId, payload);
                setMessage('User updated.');
            } else {
                await createAdminUser(payload);
                setMessage('User created.');
            }
            setUserForm(blankUser);
            setEditingUserId(null);
            loadAdmin();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to save user.');
        }
    };

    const saveHospital = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const payload = {
                ...hospitalForm,
                latitude: hospitalForm.latitude === '' ? null : hospitalForm.latitude,
                longitude: hospitalForm.longitude === '' ? null : hospitalForm.longitude,
            };
            if (editingHospitalId) {
                await updateAdminHospital(editingHospitalId, payload);
                setMessage('Hospital updated.');
            } else {
                await createAdminHospital(payload);
                setMessage('Hospital created.');
            }
            setHospitalForm(blankHospital);
            setEditingHospitalId(null);
            loadAdmin();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to save hospital.');
        }
    };

    const saveSettings = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const res = await updateSystemSettings(settings);
            setSettings(res.data.settings);
            setMessage('System settings updated.');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update settings.');
        }
    };

    const changeUserStatus = async (user, accountStatus) => {
        setMessage('');
        setError('');
        try {
            await updateAdminUserStatus(user.id, accountStatus, `Admin set account to ${accountStatus}.`);
            setMessage(`${user.name} is now ${accountStatus}.`);
            loadAdmin();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update account status.');
        }
    };

    const resetPassword = async (user) => {
        setMessage('');
        setError('');
        try {
            const res = await resetAdminUserPassword(user.id);
            setMessage(`${user.name} password reset. Temporary password: ${res.data.temporary_password}`);
            loadAdmin();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to reset password.');
        }
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h2>Admin Management</h2>
                    <p>Manage users, hospitals, account status, and system defaults.</p>
                </div>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="admin-grid">
                <div className="admin-column">
                <div className="card admin-form-card">
                    <div className="card-header">
                        <span>{editingUserId ? 'Edit User' : 'Create User'}</span>
                        {editingUserId && <button className="btn btn-outline btn-sm" type="button" onClick={() => { setEditingUserId(null); setUserForm(blankUser); }}>New</button>}
                    </div>
                    <div className="card-body">
                        <form className="admin-compact-form" onSubmit={saveUser}>
                            <div className="form-group">
                                <label>Name</label>
                                <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="sending_staff">Intake Staff</option>
                                    <option value="receiving_staff">Acceptance Staff</option>
                                    <option value="coordinator">Coordinator</option>
                                    <option value="dispatcher">Dispatcher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Hospital</label>
                                <select value={userForm.hospital_id || ''} onChange={(e) => setUserForm({ ...userForm, hospital_id: e.target.value })}>
                                    <option value="">System-wide</option>
                                    {data.hospitals.map((hospital) => (
                                        <option value={hospital.id} key={hospital.id}>{hospital.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Account Status</label>
                                <select value={userForm.account_status} onChange={(e) => setUserForm({ ...userForm, account_status: e.target.value })}>
                                    <option value="pending">Pending approval</option>
                                    <option value="approved">Approved</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Leave blank when editing to keep password" />
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">{editingUserId ? 'Update User' : 'Create User'}</button>
                        </form>
                    </div>
                </div>

                </div>

                <div className="admin-column">
                <div className="card admin-form-card">
                    <div className="card-header">
                        <span>{editingHospitalId ? 'Edit Hospital' : 'Create Hospital'}</span>
                        {editingHospitalId && <button className="btn btn-outline btn-sm" type="button" onClick={() => { setEditingHospitalId(null); setHospitalForm(blankHospital); }}>New</button>}
                    </div>
                    <div className="card-body">
                        <form className="admin-compact-form admin-hospital-form" onSubmit={saveHospital}>
                            <div className="form-group">
                                <label>Name</label>
                                <input value={hospitalForm.name} onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input value={hospitalForm.address} onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Contact Number</label>
                                <input value={hospitalForm.contact_number} onChange={(e) => setHospitalForm({ ...hospitalForm, contact_number: e.target.value })} required />
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Latitude</label>
                                    <input type="number" step="0.0000001" value={hospitalForm.latitude || ''} onChange={(e) => setHospitalForm({ ...hospitalForm, latitude: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Longitude</label>
                                    <input type="number" step="0.0000001" value={hospitalForm.longitude || ''} onChange={(e) => setHospitalForm({ ...hospitalForm, longitude: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Placement Desk Name</label>
                                    <input value={hospitalForm.transfer_contact_name || ''} onChange={(e) => setHospitalForm({ ...hospitalForm, transfer_contact_name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Placement Desk Phone</label>
                                    <input value={hospitalForm.transfer_contact_phone || ''} onChange={(e) => setHospitalForm({ ...hospitalForm, transfer_contact_phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Emergency Contact Name</label>
                                    <input value={hospitalForm.emergency_contact_name || ''} onChange={(e) => setHospitalForm({ ...hospitalForm, emergency_contact_name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Emergency Contact Phone</label>
                                    <input value={hospitalForm.emergency_contact_phone || ''} onChange={(e) => setHospitalForm({ ...hospitalForm, emergency_contact_phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select value={hospitalForm.status} onChange={(e) => setHospitalForm({ ...hospitalForm, status: e.target.value })}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">{editingHospitalId ? 'Update Hospital' : 'Create Hospital'}</button>
                        </form>
                    </div>
                </div>

                </div>

                <div className="admin-column admin-ops-column">
                    <div className="card admin-settings-card">
                        <div className="card-header">
                            <span>System Settings</span>
                        </div>
                        <div className="card-body">
                            {settings && (
                                <form className="admin-settings-form" onSubmit={saveSettings}>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Reservation Minutes</label>
                                            <input type="number" min="5" max="240" value={settings.reservation_minutes} onChange={(e) => setSettings({ ...settings, reservation_minutes: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>SLA Pending Minutes</label>
                                            <input type="number" min="5" max="240" value={settings.sla_pending_minutes} onChange={(e) => setSettings({ ...settings, sla_pending_minutes: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Case Types</label>
                                        <input value={settings.case_types} onChange={(e) => setSettings({ ...settings, case_types: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Decline Reasons</label>
                                        <textarea value={settings.decline_reasons} onChange={(e) => setSettings({ ...settings, decline_reasons: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Bed Categories</label>
                                        <input value={settings.bed_categories} onChange={(e) => setSettings({ ...settings, bed_categories: e.target.value })} />
                                    </div>
                                    <button className="btn btn-primary btn-sm" type="submit">Save Settings</button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="admin-management-switcher">
                {[
                    ['users', 'Users', data.users.length, 'Manage account access and role assignments.'],
                    ['hospitals', 'Hospitals', data.hospitals.length, 'Review network facilities and contact points.'],
                    ['activity', 'Admin Activity', data.admin_activity?.length || 0, 'Track admin changes and security actions.'],
                ].map(([key, label, count, helper]) => (
                    <button
                        key={key}
                        type="button"
                        className={`admin-switch-card ${activePanel === key ? 'is-active' : ''}`}
                        onClick={() => setActivePanel(key)}
                    >
                        <span>{label}</span>
                        <strong>{count}</strong>
                        <small>{helper}</small>
                    </button>
                ))}
            </div>

            <div className="card admin-panel-card">
                <div className="card-header">
                    <span>{activePanel === 'users' ? 'Users' : activePanel === 'hospitals' ? 'Hospitals' : 'Admin Activity'}</span>
                </div>
                {activePanel === 'users' && (
                    <div className="card-body table-wrapper admin-panel-table">
                        <table>
                            <colgroup>
                                <col style={{ width: '29%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '22%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Hospital</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.users.map((user) => (
                                    <tr key={user.id}>
                                        <td><strong>{user.name}</strong><br /><small>{user.email}</small></td>
                                        <td><span className={`admin-role-chip role-${user.role}`}>{roleLabel(user.role)}</span></td>
                                        <td><span className={`badge badge-${user.account_status || 'approved'}`}>{(user.account_status || 'approved').replace('_', ' ')}</span></td>
                                        <td>{user.hospital?.name || 'System-wide'}</td>
                                        <td>
                                            <div className="action-buttons admin-user-actions">
                                                <button className="btn btn-outline btn-sm" onClick={() => { setEditingUserId(user.id); setUserForm({ name: user.name, email: user.email, role: user.role, hospital_id: user.hospital_id || '', password: '', account_status: user.account_status || 'approved' }); }}>Edit</button>
                                                {(user.account_status || 'approved') !== 'approved' && (
                                                    <button className="btn btn-success btn-sm" type="button" onClick={() => changeUserStatus(user, 'approved')}>Approve</button>
                                                )}
                                                {(user.account_status || 'approved') === 'approved' && (
                                                    <button className="btn btn-warning btn-sm" type="button" onClick={() => changeUserStatus(user, 'suspended')}>Disable</button>
                                                )}
                                                <button className="btn btn-outline btn-sm" type="button" onClick={() => resetPassword(user)}>Reset</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {activePanel === 'hospitals' && (
                    <div className="card-body table-wrapper admin-panel-table">
                        <table>
                            <colgroup>
                                <col style={{ width: '38%' }} />
                                <col style={{ width: '32%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '16%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Hospital</th>
                                    <th>Contact</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.hospitals.map((hospital) => (
                                    <tr key={hospital.id}>
                                        <td><strong>{hospital.name}</strong><br /><small>{hospital.address}</small><br /><small>{hospital.latitude && hospital.longitude ? `${hospital.latitude}, ${hospital.longitude}` : 'No coordinates'}</small></td>
                                        <td>{hospital.contact_number}<br /><small>{hospital.transfer_contact_name || 'Placement desk'} {hospital.transfer_contact_phone || ''}</small></td>
                                        <td><span className={`badge badge-${hospital.status}`}>{hospital.status}</span></td>
                                        <td><button className="btn btn-outline btn-sm" onClick={() => { setEditingHospitalId(hospital.id); setHospitalForm({ name: hospital.name, address: hospital.address, latitude: hospital.latitude || '', longitude: hospital.longitude || '', contact_number: hospital.contact_number, transfer_contact_name: hospital.transfer_contact_name || '', transfer_contact_phone: hospital.transfer_contact_phone || '', emergency_contact_name: hospital.emergency_contact_name || '', emergency_contact_phone: hospital.emergency_contact_phone || '', status: hospital.status }); }}>Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {activePanel === 'activity' && (
                    <div className="card-body admin-activity-list">
                        {(data.admin_activity || []).length === 0 ? (
                            <div className="board-empty">No admin activity yet.</div>
                        ) : data.admin_activity.map((item) => (
                            <div key={item.id} className="admin-activity-item">
                                <div>
                                    <strong>{item.action?.replaceAll('_', ' ')}</strong>
                                    <span>{item.target_user?.name || 'Unknown user'} by {item.admin?.name || 'System'}</span>
                                </div>
                                <small>{new Date(item.created_at).toLocaleString()}</small>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
