import React, { useState, useEffect } from 'react';
import { getHospitals, updateHospitalCapacity } from '../api/axios';

export default function HospitalCapacity() {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const user = JSON.parse(localStorage.getItem('carebridge_user') || '{}');
    const userHospitalId = user.hospital_id;
    const canEditCapacity = (hospitalId) => user.role === 'receiving_staff' && hospitalId === userHospitalId;

    useEffect(() => {
        fetchHospitals();
    }, []);

    const fetchHospitals = async () => {
        try {
            const res = await getHospitals();
            setHospitals(res.data.hospitals);
        } catch (err) {
            console.error(err);
            setError('Unable to load hospital capacity.');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (hospital) => {
        if (!canEditCapacity(hospital.id)) return;
        const cap = hospital.latest_capacity || {};
        setEditForm({
            general_beds_available: cap.general_beds_available || 0,
            emergency_beds_available: cap.emergency_beds_available || 0,
            icu_beds_available: cap.icu_beds_available || 0,
            ambulance_available: cap.ambulance_available || 0,
        });
        setEditingId(hospital.id);
        setSuccess('');
        setError('');
    };

    const saveEdit = async (hospitalId) => {
        try {
            await updateHospitalCapacity(hospitalId, editForm);
            setEditingId(null);
            setSuccess('Capacity updated successfully.');
            setError('');
            fetchHospitals();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update capacity.');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
        setError('');
    };

    if (loading) return <div className="loading">Loading hospitals...</div>;

    const totalBeds = (cap) => {
        if (!cap) return '-';
        return (cap.general_beds_available || 0) + (cap.emergency_beds_available || 0) + (cap.icu_beds_available || 0);
    };

    return (
        <div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Hospital Capacity</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '24px' }}>
                Acceptance Staff can update capacity for their own hospital. Other roles monitor capacity from their assigned views.
            </p>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
                <div className="card-body">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Hospital</th>
                                    <th>General Beds</th>
                                    <th>Emergency Beds</th>
                                    <th>ICU Beds</th>
                                    <th>Ambulances</th>
                                    <th>Total Beds</th>
                                    <th>Last Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hospitals.map((hospital) => {
                                    const cap = hospital.latest_capacity;
                                    const isEditing = editingId === hospital.id;

                                    return (
                                        <tr key={hospital.id}>
                                            <td><strong>{hospital.name}</strong></td>
                                            {isEditing ? (
                                                <>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editForm.general_beds_available}
                                                            onChange={(e) => setEditForm({ ...editForm, general_beds_available: parseInt(e.target.value) || 0 })}
                                                            style={{ width: '70px', padding: '6px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editForm.emergency_beds_available}
                                                            onChange={(e) => setEditForm({ ...editForm, emergency_beds_available: parseInt(e.target.value) || 0 })}
                                                            style={{ width: '70px', padding: '6px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editForm.icu_beds_available}
                                                            onChange={(e) => setEditForm({ ...editForm, icu_beds_available: parseInt(e.target.value) || 0 })}
                                                            style={{ width: '70px', padding: '6px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editForm.ambulance_available}
                                                            onChange={(e) => setEditForm({ ...editForm, ambulance_available: parseInt(e.target.value) || 0 })}
                                                            style={{ width: '70px', padding: '6px' }}
                                                        />
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>{cap?.general_beds_available ?? 0}</td>
                                                    <td>{cap?.emergency_beds_available ?? 0}</td>
                                                    <td>{cap?.icu_beds_available ?? 0}</td>
                                                    <td>{cap?.ambulance_available ?? 0}</td>
                                                    <td><strong>{totalBeds(cap)}</strong></td>
                                                    <td>
                                                        {cap?.last_updated
                                                            ? new Date(cap.last_updated).toLocaleDateString()
                                                            : '-'}
                                                    </td>
                                                </>
                                            )}
                                            <td>
                                                {isEditing ? (
                                                    <div className="action-buttons">
                                                        <button className="btn btn-success btn-sm" onClick={() => saveEdit(hospital.id)}>Save</button>
                                                        <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    canEditCapacity(hospital.id) && (
                                                        <button className="btn btn-primary btn-sm" onClick={() => startEdit(hospital)}>Edit</button>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
