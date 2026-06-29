import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/axios';
import ThemeToggle from '../components/ThemeToggle';

const demoAccounts = [
    ['Intake Staff', 'sarah@citygeneral.com'],
    ['Acceptance Staff', 'mark@stmary.com'],
    ['Coordinator', 'maria@carebridge.com'],
    ['Dispatcher', 'dispatcher@carebridge.com'],
    ['Admin', 'admin@carebridge.com'],
];

export default function Login({ theme, toggleTheme }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email, password);
            localStorage.setItem('carebridge_token', res.data.token);
            localStorage.setItem('carebridge_user', JSON.stringify(res.data.user));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <ThemeToggle theme={theme} onToggle={toggleTheme} className="public-theme-toggle" />
            <div className="auth-shell">
                <section className="auth-panel">
                    <Link to="/" className="auth-logo-link">
                        <img src="/images/carebridge-logo.svg" alt="CareBridge" />
                    </Link>
                    <div className="auth-panel-copy">
                        <p className="landing-kicker">Department access</p>
                        <h1>Sign in to coordinate rejected patient placement.</h1>
                        <p>
                            Open the department workspace for rejected patient intake, accepting hospital coordination, delivery tracking, and role-based controls.
                        </p>
                    </div>
                    <div className="auth-benefit-grid">
                        <div>
                            <strong>Placement-aware</strong>
                            <span>Reserve matching beds when rejected cases move forward.</span>
                        </div>
                        <div>
                            <strong>Role scoped</strong>
                            <span>Each team sees the controls aligned to their job.</span>
                        </div>
                        <div>
                            <strong>Status logged</strong>
                            <span>Track rejected patient cases from intake to handoff.</span>
                        </div>
                    </div>
                </section>

                <section className="auth-form-card">
                    <div className="auth-form-header">
                        <span>Welcome back</span>
                        <h2>Sign In</h2>
                        <p>Use a demo account or your hospital staff account.</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="sarah@citygeneral.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="password123"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="login-text-actions">
                        <Link to="/forgot-password">Forgot password?</Link>
                        <div className="login-divider"></div>
                        <span>No account?</span>
                        <Link to="/signup">Create new account</Link>
                    </div>

                    <div className="demo-account-panel">
                        <div className="demo-account-header">
                            <strong>Demo Accounts</strong>
                            <span>Password: password123</span>
                        </div>
                        <div className="demo-account-grid">
                            {demoAccounts.map(([role, demoEmail]) => (
                                <button
                                    type="button"
                                    key={demoEmail}
                                    onClick={() => {
                                        setEmail(demoEmail);
                                        setPassword('password123');
                                    }}
                                >
                                    <strong>{role}</strong>
                                    <span>{demoEmail}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
