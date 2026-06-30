import React, { useEffect, useMemo, useState } from 'react';
import { getHospitals } from '../api/axios';

export default function HospitalDirectory() {
    const [hospitals, setHospitals] = useState([]);
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({ caseType: '', minBeds: '', ambulance: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getHospitals()
            .then((res) => setHospitals(res.data.hospitals))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const value = query.toLowerCase();
        return hospitals.filter((hospital) => {
            const capacity = hospital.latest_capacity;
            const totalBeds = capacity
                ? capacity.general_beds_available + capacity.emergency_beds_available + capacity.icu_beds_available
                : 0;
            const matchesText = hospital.name.toLowerCase().includes(value)
                || hospital.address.toLowerCase().includes(value)
                || hospital.contact_number.toLowerCase().includes(value);
            const matchesCase = !filters.caseType
                || (filters.caseType === 'general' && (capacity?.general_beds_available || 0) > 0)
                || (filters.caseType === 'emergency' && (capacity?.emergency_beds_available || 0) > 0)
                || (filters.caseType === 'icu' && (capacity?.icu_beds_available || 0) > 0);
            const matchesBeds = !filters.minBeds || totalBeds >= Number(filters.minBeds);
            const matchesAmbulance = !filters.ambulance || (capacity?.ambulance_available || 0) > 0;

            return matchesText && matchesCase && matchesBeds && matchesAmbulance;
        });
    }, [hospitals, query, filters]);

    if (loading) return <div className="loading">Loading hospital directory...</div>;

    const totalBeds = hospitals.reduce((total, hospital) => {
        const capacity = hospital.latest_capacity;
        return total + (capacity ? capacity.general_beds_available + capacity.emergency_beds_available + capacity.icu_beds_available : 0);
    }, 0);
    const ambulanceCount = hospitals.reduce((total, hospital) => total + (hospital.latest_capacity?.ambulance_available || 0), 0);

    return (
        <div className="directory-page">
            <div className="page-header">
                <div>
                    <span>Placement Directory</span>
                    <h2>Accepting Hospital Directory</h2>
                    <p>Search partner hospitals, contacts, active status, and capacity that can accept rejected patients.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{hospitals.length}</strong><small>Hospitals</small></div>
                    <div><strong>{totalBeds}</strong><small>Open Beds</small></div>
                    <div><strong>{ambulanceCount}</strong><small>Ambulances</small></div>
                </div>
            </div>

            <div className="directory-toolbar">
                <div className="form-group directory-search">
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accepting hospitals, address, contact..." />
                </div>
                <div className="directory-filter-controls">
                    <select value={filters.caseType} onChange={(e) => setFilters({ ...filters, caseType: e.target.value })}>
                        <option value="">Any capacity</option>
                        <option value="general">General bed</option>
                        <option value="emergency">Emergency bed</option>
                        <option value="icu">ICU bed</option>
                    </select>
                    <input
                        type="number"
                        min="0"
                        value={filters.minBeds}
                        onChange={(e) => setFilters({ ...filters, minBeds: e.target.value })}
                        placeholder="Min beds"
                    />
                    <label className="toggle-pill">
                        <input
                            type="checkbox"
                            checked={filters.ambulance}
                            onChange={(e) => setFilters({ ...filters, ambulance: e.target.checked })}
                        />
                        Ambulance
                    </label>
                </div>
                <span>{filtered.length} matching hospitals</span>
            </div>

            <div className="directory-grid">
                {filtered.map((hospital) => {
                    const capacity = hospital.latest_capacity;
                    const totalBeds = capacity
                        ? capacity.general_beds_available + capacity.emergency_beds_available + capacity.icu_beds_available
                        : 0;

                    return (
                        <article className="directory-card" key={hospital.id}>
                            <div className="directory-card-head">
                                <div>
                                    <h3>{hospital.name}</h3>
                                    <p>{hospital.address}</p>
                                </div>
                                <span className={`badge badge-${hospital.status === 'active' ? 'completed' : 'cancelled'}`}>{hospital.status}</span>
                            </div>
                            <div className="directory-card-body">
                                <div className="directory-contact-block">
                                    <span>Contact</span>
                                    <strong className="directory-contact">{hospital.contact_number}</strong>
                                    <small>{hospital.transfer_contact_name || 'Placement desk'} {hospital.transfer_contact_phone || ''}</small>
                                    <small>{hospital.emergency_contact_name ? `Emergency: ${hospital.emergency_contact_name} ${hospital.emergency_contact_phone || ''}` : 'Emergency contact not listed'}</small>
                                </div>
                                <div className="directory-total-block">
                                    <span>Total Beds</span>
                                    <strong>{totalBeds}</strong>
                                    <small>{capacity?.ambulance_available ?? 0} ambulance available</small>
                                </div>
                            </div>
                            <div className="capacity-strip">
                                <span>General {capacity?.general_beds_available ?? 0}</span>
                                <span>ER {capacity?.emergency_beds_available ?? 0}</span>
                                <span>ICU {capacity?.icu_beds_available ?? 0}</span>
                                <span>Ambulance {capacity?.ambulance_available ?? 0}</span>
                            </div>
                            <div className="capacity-meter">
                                <span style={{ width: `${Math.min(100, totalBeds * 7)}%` }}></span>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
