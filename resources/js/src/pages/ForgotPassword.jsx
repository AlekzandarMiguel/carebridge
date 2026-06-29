import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/axios';
import ThemeToggle from '../components/ThemeToggle';

export default function ForgotPassword({ theme, toggleTheme }) {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setToken('');
        setLoading(true);

        try {
            const res = await forgotPassword(email);
            setMessage(res.data.message);
            setToken(res.data.reset_token || '');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to start password reset.');
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

                <h1><span className="brand-name">Reset Access</span></h1>
                <p>Generate a password reset token</p>

                {error && <div className="alert alert-error">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                {token && (
                    <div className="token-box">
                        <strong>Reset token</strong>
                        <code>{token}</code>
                        <Link className="btn btn-primary btn-block" to="/reset-password" state={{ email, token }}>
                            Continue to Reset Password
                        </Link>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="intake.bpmc@carebridge.com"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Generating...' : 'Generate Reset Token'}
                    </button>
                </form>

                <div className="auth-links">
                    <Link to="/login">Back to sign in</Link>
                </div>
            </div>
        </div>
    );
}
