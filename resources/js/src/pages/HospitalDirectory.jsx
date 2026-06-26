import React, { useEffect, useMemo, useState } from 'react';
import { getHospitals } from '../api/axios';

export default function HospitalDirectory() {
    const [hospitals, setHospitals] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getHospitals()
            .then((res) => setHospitals(res.data.hospitals))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const value = query.toLowerCase();
        return hospitals.filter((hospital) =>
            hospital.name.toLowerCase().includes(value)
            || hospital.address.toLowerCase().includes(value)
            || hospital.contact_number.toLowerCase().includes(value)
        );
    }, [hospitals, query]);

    if (loading) return <div className="loading">Loading hospital directory...</div>;

    const totalBeds = hospitals.reduce((total, hospital) => {
        const capacity = hospital.latest_capacity;
        return total + (capacity ? capacity.general_beds_available + capacity.emergency_beds_available + capacity.icu_beds_available : 0);
    }, 0);
    const ambulanceCount = hospitals.reduce((total, hospital) => total + (hospital.latest_capacity?.ambulance_available || 0), 0);

    return (
        <div>
            <div className="feature-hero directory-hero">
                <div>
                    <span>Network Directory</span>
                    <h2>Hospital Directory</h2>
                    <p>Search partner hospitals, contacts, active status, and available capacity.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{hospitals.length}</strong><small>Hospitals</small></div>
                    <div><strong>{totalBeds}</strong><small>Open Beds</small></div>
                    <div><strong>{ambulanceCount}</strong><small>Ambulances</small></div>
                </div>
            </div>

            <div className="directory-toolbar">
                <div className="form-group directory-search">
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search hospitals, address, contact..." />
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
                            <strong className="directory-contact">{hospital.contact_number}</strong>
                            <p>{hospital.transfer_contact_name || 'Transfer desk'} {hospital.transfer_contact_phone || ''}</p>
                            <p>{hospital.emergency_contact_name ? `Emergency: ${hospital.emergency_contact_name} ${hospital.emergency_contact_phone || ''}` : 'Emergency contact not listed'}</p>
                            <div className="capacity-strip">
                                <span>{totalBeds} total beds</span>
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
