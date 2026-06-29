import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getHospitals, getTransferRequest, getTransferRecommendations, createTransferRequest } from '../api/axios';

const checklistLabels = {
    referral_note: 'Referral or endorsement note',
    lab_results: 'Relevant lab results',
    imaging: 'Imaging or diagnostic summary',
    consent: 'Transfer consent confirmed',
    transport_form: 'Transport details prepared',
};

const emptyChecklist = Object.keys(checklistLabels).reduce((items, key) => ({ ...items, [key]: false }), {});

export default function CreateTransfer() {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [form, setForm] = useState({
        receiving_hospital_id: '',
        patient_reference_code: '',
        case_type: 'general',
        urgency_level: 'normal',
        notes: '',
        rejection_reason: '',
        placement_need: '',
        documents_ready: false,
        document_checklist: emptyChecklist,
        privacy_confirmed: false,
        transport_team: '',
        ambulance_unit: '',
        transport_contact: '',
        estimated_arrival_at: '',
    });

    const user = JSON.parse(localStorage.getItem('carebridge_user') || '{}');

    useEffect(() => {
        fetchHospitals();
    }, []);

    useEffect(() => {
        const sourceId = searchParams.get('from');
        if (!sourceId) return;

        getTransferRequest(sourceId)
            .then((res) => {
                const transfer = res.data.transfer_request;
                setForm((current) => ({
                    ...current,
                    patient_reference_code: `${transfer.patient_reference_code}-R`,
                    case_type: transfer.case_type || 'general',
                    urgency_level: transfer.urgency_level || 'normal',
                    notes: transfer.notes || '',
                    rejection_reason: transfer.decline_reason_category || 'Previous request declined',
                    placement_need: transfer.placement_need || transfer.case_type || '',
                    documents_ready: Boolean(transfer.documents_ready),
                    document_checklist: transfer.document_checklist || emptyChecklist,
                    privacy_confirmed: false,
                    transport_team: transfer.transport_team || '',
                    ambulance_unit: transfer.ambulance_unit || '',
                    transport_contact: transfer.transport_contact || '',
                    estimated_arrival_at: '',
                }));
            })
            .catch(() => {});
    }, [searchParams]);

    useEffect(() => {
        fetchRecommendations(form.case_type);
    }, [form.case_type]);

    const fetchHospitals = async () => {
        try {
            const res = await getHospitals();
            setHospitals(res.data.hospitals.filter(h => h.id !== user.hospital_id));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecommendations = async (caseType) => {
        try {
            const res = await getTransferRecommendations(caseType);
            setRecommendations(res.data.recommendations || []);
        } catch (err) {
            setRecommendations([]);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleChecklistChange = (key, checked) => {
        const nextChecklist = { ...form.document_checklist, [key]: checked };
        setForm({
            ...form,
            document_checklist: nextChecklist,
            documents_ready: Object.values(nextChecklist).every(Boolean),
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await createTransferRequest(form);
            setSuccess(true);
            setForm({
                receiving_hospital_id: '',
                patient_reference_code: '',
                case_type: 'general',
                urgency_level: 'normal',
                notes: '',
                rejection_reason: '',
                placement_need: '',
                documents_ready: false,
                document_checklist: emptyChecklist,
                privacy_confirmed: false,
                transport_team: '',
                ambulance_unit: '',
                transport_contact: '',
                estimated_arrival_at: '',
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create transfer request.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    if (success) {
        return (
            <div>
                <div className="alert alert-success">
                    Transfer request created successfully.
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button className="btn btn-primary" onClick={() => setSuccess(false)}>
                        Create Another
                    </button>
                    <button className="btn btn-outline" onClick={() => navigate('/transfer-tracking')}>
                        View Transfers
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Create Transfer Request</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '24px' }}>
                From: <strong>{user.hospital?.name}</strong> - Select a receiving hospital for a capacity request.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-grid">
                <div className="card">
                <div className="card-body" style={{ maxWidth: '600px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Receiving Hospital *</label>
                            <select name="receiving_hospital_id" value={form.receiving_hospital_id} onChange={handleChange} required>
                                <option value="">Select Hospital</option>
                                {hospitals.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.name}
                                        {h.latest_capacity ? ` (${h.latest_capacity.general_beds_available + h.latest_capacity.emergency_beds_available + h.latest_capacity.icu_beds_available} beds)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Patient Reference Code *</label>
                            <input
                                type="text"
                                name="patient_reference_code"
                                value={form.patient_reference_code}
                                onChange={handleChange}
                                placeholder="e.g., PT-2026-0042"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Case Type *</label>
                            <select name="case_type" value={form.case_type} onChange={handleChange} required>
                                <option value="general">General</option>
                                <option value="emergency">Emergency</option>
                                <option value="icu">ICU</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Urgency Level *</label>
                            <select name="urgency_level" value={form.urgency_level} onChange={handleChange} required>
                                <option value="normal">Normal</option>
                                <option value="urgent">Urgent</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Additional details about the patient or transfer..."
                            />
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Rejected Patient Reason</label>
                                <select name="rejection_reason" value={form.rejection_reason} onChange={handleChange}>
                                    <option value="">Select reason</option>
                                    <option value="No available bed">No available bed</option>
                                    <option value="No ICU capacity">No ICU capacity</option>
                                    <option value="No emergency capacity">No emergency capacity</option>
                                    <option value="Service unavailable">Service unavailable</option>
                                    <option value="Needs higher level of care">Needs higher level of care</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Placement Need</label>
                                <input
                                    name="placement_need"
                                    value={form.placement_need}
                                    onChange={handleChange}
                                    placeholder="e.g., ICU bed with ventilator"
                                />
                            </div>
                        </div>

                        <div className="intake-panel">
                            <div>
                                <strong>Handoff readiness</strong>
                                <span>{form.documents_ready ? 'All checklist items are complete.' : 'Complete the items available before sending.'}</span>
                            </div>
                            <div className="checklist-grid">
                                {Object.entries(checklistLabels).map(([key, label]) => (
                                    <label className="check-row compact" key={key}>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(form.document_checklist[key])}
                                            onChange={(e) => handleChecklistChange(key, e.target.checked)}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Transport Team</label>
                                <input
                                    name="transport_team"
                                    value={form.transport_team}
                                    onChange={handleChange}
                                    placeholder="e.g., City EMS Team 2"
                                />
                            </div>
                            <div className="form-group">
                                <label>Ambulance / Unit</label>
                                <input
                                    name="ambulance_unit"
                                    value={form.ambulance_unit}
                                    onChange={handleChange}
                                    placeholder="e.g., AMB-14"
                                />
                            </div>
                            <div className="form-group">
                                <label>Transport Contact</label>
                                <input
                                    name="transport_contact"
                                    value={form.transport_contact}
                                    onChange={handleChange}
                                    placeholder="e.g., 555-0199"
                                />
                            </div>
                            <div className="form-group">
                                <label>Estimated Arrival</label>
                                <input
                                    type="datetime-local"
                                    name="estimated_arrival_at"
                                    value={form.estimated_arrival_at}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <label className="check-row privacy-confirm">
                            <input
                                type="checkbox"
                                checked={form.privacy_confirmed}
                                onChange={(e) => setForm({ ...form, privacy_confirmed: e.target.checked })}
                                required
                            />
                            I confirm this request uses the patient reference code only and avoids unnecessary personal information.
                        </label>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Creating...' : 'Send Transfer Request'}
                            </button>
                            <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard')}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
                </div>

                <div className="card">
                    <div className="card-header">Suggested Receiving Hospitals</div>
                    <div className="card-body recommendation-list">
                        {recommendations.length === 0 ? (
                            <div className="empty-state"><p>No recommendations available.</p></div>
                        ) : recommendations.map((hospital, index) => (
                            <button
                                type="button"
                                className={`recommendation-card ${form.receiving_hospital_id === String(hospital.id) ? 'selected' : ''}`}
                                key={hospital.id}
                                onClick={() => setForm({ ...form, receiving_hospital_id: String(hospital.id) })}
                            >
                                <span className="recommendation-rank">#{index + 1}</span>
                                <span className="recommendation-content">
                                    <strong>{hospital.name}</strong>
                                    <small>{hospital.matching_beds} matching beds - {hospital.total_beds} total beds</small>
                                    <small>{hospital.contact_number}</small>
                                </span>
                                <span className="recommendation-meter" aria-hidden="true">
                                    <span style={{ width: `${Math.min(100, hospital.matching_beds * 18)}%` }}></span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
