import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthOptions, register } from '../api/axios';
import ThemeToggle from '../components/ThemeToggle';

export default function SignUp({ theme, toggleTheme }) {
    const [options, setOptions] = useState({ hospitals: [], roles: [] });
    const [form, setForm] = useState({
        name: '',
        email: '',
        hospital_id: '',
        role: 'sending_staff',
        password: '',
        password_confirmation: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getAuthOptions()
            .then((res) => setOptions(res.data))
            .catch(() => setError('Unable to load signup options.'));
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await register(form);
            setSuccess(res.data.message || 'Account request submitted. An admin must approve it before sign in.');
            setForm({
                name: '',
                email: '',
                hospital_id: '',
                role: 'sending_staff',
                password: '',
                password_confirmation: '',
            });
        } catch (err) {
            const validation = err.response?.data?.errors;
            setError(validation ? Object.values(validation).flat().join(' ') : err.response?.data?.message || 'Unable to create account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <ThemeToggle theme={theme} onToggle={toggleTheme} className="public-theme-toggle" />
            <div className="login-card auth-card-wide">
                <Link to="/" className="auth-logo-link">
                    <img src="/images/carebridge-logo.svg" alt="CareBridge" />
                </Link>

                <h1><span className="brand-name">Create Account</span></h1>
                <p>Join your hospital workspace</p>

                {error && <div className="alert alert-error">{error}</div>}
                {success && (
                    <div className="alert alert-success">
                        {success} <Link to="/login">Return to sign in</Link>
                    </div>
                )}

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
                        <label>Hospital</label>
                        <select name="hospital_id" value={form.hospital_id} onChange={handleChange} required>
                            <option value="">Select hospital</option>
                            {options.hospitals.map((hospital) => (
                                <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Role</label>
                        <select name="role" value={form.role} onChange={handleChange} required>
                            {options.roles.map((role) => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} required minLength={8} />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-links">
                    <Link to="/login">Already have an account? Sign in</Link>
                </div>
            </div>
        </div>
    );
}
