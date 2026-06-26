import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/axios';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPassword({ theme, toggleTheme }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: location.state?.email || '',
        token: location.state?.token || '',
        password: '',
        password_confirmation: '',
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await resetPassword(form);
            setMessage(res.data.message);
            setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            const validation = err.response?.data?.errors;
            setError(validation ? Object.values(validation).flat().join(' ') : err.response?.data?.message || 'Unable to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <ThemeToggle theme={theme} onToggle={toggleTheme} className="public-theme-toggle" />
            <div className="login-card">
                <Link to="/" className="auth-logo-link">
                    <img src="/images/carebridge-logo.svg" alt="CareBridge" />
                </Link>

                <h1><span className="brand-name">New Password</span></h1>
                <p>Enter your reset token and new password</p>

                {error && <div className="alert alert-error">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Reset Token</label>
                        <textarea name="token" value={form.token} onChange={handleChange} rows={3} required />
                    </div>

                    <div className="form-group">
                        <label>New Password</label>
                        <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} required minLength={8} />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <div className="auth-links">
                    <Link to="/login">Back to sign in</Link>
                </div>
            </div>
        </div>
    );
}
