import React, { useEffect, useState } from 'react';
import { createAdminHospital, createAdminUser, getAdminData, getSystemSettings, refreshDemoData, updateAdminHospital, updateAdminUser, updateSystemSettings } from '../api/axios';

const blankUser = { name: '', email: '', role: 'sending_staff', hospital_id: '', password: 'password123', account_status: 'approved' };
const blankHospital = { name: '', address: '', latitude: '', longitude: '', contact_number: '', transfer_contact_name: '', transfer_contact_phone: '', emergency_contact_name: '', emergency_contact_phone: '', status: 'active' };
const permissionRows = [
    ['Intake Staff', 'Submit rejected patient cases, reroute declined cases, start delivery'],
    ['Acceptance Staff', 'Review acceptance queue, accept/decline cases, reserve beds, update own capacity'],
    ['Coordinator', 'Department command view, escalation, coordinator notes, analytics'],
    ['Dispatcher', 'Assign active cases, maintain route estimates, add delivery timeline updates'],
    ['Admin', 'Manage department users/hospitals, command view, audit logs, settings'],
];

export default function AdminManagement() {
    const [data, setData] = useState({ users: [], hospitals: [] });
    const [userForm, setUserForm] = useState(blankUser);
    const [hospitalForm, setHospitalForm] = useState(blankHospital);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editingHospitalId, setEditingHospitalId] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [settings, setSettings] = useState(null);

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

    const runDemoRefresh = async () => {
        if (!window.confirm('Refresh demo hospitals, users, and capacities? Existing placement history will stay.')) return;
        setMessage('');
        setError('');
        try {
            const res = await refreshDemoData();
            setData({ users: res.data.users, hospitals: res.data.hospitals });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to refresh demo data.');
        }
    };

    const adminCount = data.users.filter((user) => user.role === 'admin').length;
    const activeHospitals = data.hospitals.filter((hospital) => hospital.status === 'active').length;

    return (
        <div>
            <div className="feature-hero admin-hero">
                <div>
                    <span>System Control</span>
                    <h2>Admin Management</h2>
                    <p>Manage hospital records, user roles, account approval, active status, and reset account passwords.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{data.users.length}</strong><small>Users</small></div>
                    <div><strong>{activeHospitals}</strong><small>Active Hospitals</small></div>
                    <div><strong>{adminCount}</strong><small>Admins</small></div>
                </div>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="admin-grid">
                <div className="card admin-form-card">
                    <div className="card-header">
                        <span>{editingUserId ? 'Edit User' : 'Create User'}</span>
                        {editingUserId && <button className="btn btn-outline btn-sm" type="button" onClick={() => { setEditingUserId(null); setUserForm(blankUser); }}>New</button>}
                    </div>
                    <div className="card-body">
                        <form onSubmit={saveUser}>
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

                <div className="card admin-form-card">
                    <div className="card-header">
                        <span>{editingHospitalId ? 'Edit Hospital' : 'Create Hospital'}</span>
                        {editingHospitalId && <button className="btn btn-outline btn-sm" type="button" onClick={() => { setEditingHospitalId(null); setHospitalForm(blankHospital); }}>New</button>}
                    </div>
                    <div className="card-body">
                        <form onSubmit={saveHospital}>
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

            <div className="admin-grid mt-24">
                <div className="card">
                    <div className="card-header">Permission Matrix</div>
                    <div className="card-body compact-list">
                        {permissionRows.map(([role, permissions]) => (
                            <div key={role}>
                                <strong>{role}</strong>
                                <span>{permissions}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <span>System Settings</span>
                        <button type="button" className="btn btn-warning btn-sm" onClick={runDemoRefresh}>Refresh Demo Data</button>
                    </div>
                    <div className="card-body">
                        {settings && (
                            <form onSubmit={saveSettings}>
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

            <div className="admin-grid mt-24">
                <div className="card admin-table-card">
                    <div className="card-header">Users</div>
                    <div className="card-body table-wrapper">
                        <table>
                            <tbody>
                                {data.users.map((user) => (
                                    <tr key={user.id}>
                                        <td><strong>{user.name}</strong><br /><small>{user.email}</small></td>
                                        <td><span className={`admin-role-chip role-${user.role}`}>{user.role.replace('_', ' ')}</span></td>
                                        <td><span className={`badge badge-${user.account_status || 'approved'}`}>{(user.account_status || 'approved').replace('_', ' ')}</span></td>
                                        <td>{user.hospital?.name || 'System-wide'}</td>
                                        <td><button className="btn btn-outline btn-sm" onClick={() => { setEditingUserId(user.id); setUserForm({ name: user.name, email: user.email, role: user.role, hospital_id: user.hospital_id || '', password: '', account_status: user.account_status || 'approved' }); }}>Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="card admin-table-card">
                    <div className="card-header">Hospitals</div>
                    <div className="card-body table-wrapper">
                        <table>
                            <tbody>
                                {data.hospitals.map((hospital) => (
                                    <tr key={hospital.id}>
                                        <td><strong>{hospital.name}</strong><br /><small>{hospital.address}</small><br /><small>{hospital.latitude && hospital.longitude ? `${hospital.latitude}, ${hospital.longitude}` : 'No coordinates'}</small></td>
                                        <td>{hospital.contact_number}<br /><small>{hospital.transfer_contact_name || 'Placement desk'} {hospital.transfer_contact_phone || ''}</small></td>
                                        <td>{hospital.status}</td>
                                        <td><button className="btn btn-outline btn-sm" onClick={() => { setEditingHospitalId(hospital.id); setHospitalForm({ name: hospital.name, address: hospital.address, latitude: hospital.latitude || '', longitude: hospital.longitude || '', contact_number: hospital.contact_number, transfer_contact_name: hospital.transfer_contact_name || '', transfer_contact_phone: hospital.transfer_contact_phone || '', emergency_contact_name: hospital.emergency_contact_name || '', emergency_contact_phone: hospital.emergency_contact_phone || '', status: hospital.status }); }}>Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
