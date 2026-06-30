import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const stats = [
    { value: '7', label: 'Case states tracked' },
    { value: '5', label: 'Role-specific workspaces' },
    { value: '24/7', label: 'Delivery visibility' },
];

const features = [
    {
        number: '01',
        title: 'Rejected Patient Intake',
        text: 'Create one clear case when a patient cannot be accepted because the hospital is full.',
    },
    {
        number: '02',
        title: 'Placement and Acceptance',
        text: 'Match the case with available capacity, request acceptance, and reserve the needed bed before delivery starts.',
    },
    {
        number: '03',
        title: 'Delivery Monitoring',
        text: 'Track ambulance details, ETA, route updates, arrival, handoff, rejection reasons, and department performance.',
    },
];

const workflow = [
    'Rejected case is recorded',
    'Accepting hospital is matched',
    'Capacity is reserved',
    'Delivery is monitored',
    'Arrival and handoff are confirmed',
];

const statusPath = [
    'Rejected',
    'Searching',
    'Accepted',
    'Dispatching',
    'En Route',
    'Arrived',
    'Completed',
];

const scenario = [
    {
        label: 'Before',
        title: 'Manual searching after rejection',
        text: 'When a hospital is full, staff may need to call around repeatedly while the patient waits for a clear accepting destination.',
    },
    {
        label: 'With CareBridge',
        title: 'One placement queue',
        text: 'The rejected case enters a shared department workspace where capacity, acceptance, delivery, and handoff are tracked together.',
    },
    {
        label: 'Result',
        title: 'Less delay and uncertainty',
        text: 'The patient-safe case code, decision trail, route details, and final handoff stay visible to the right role.',
    },
];

const roles = [
    {
        title: 'Intake Staff',
        text: 'Create rejected patient cases, document rejection reason, urgency, required service, and suggested destination.',
    },
    {
        title: 'Acceptance Staff',
        text: 'Review requests sent to their hospital, accept or decline, reserve capacity, and complete handoffs.',
    },
    {
        title: 'Dispatcher',
        text: 'Own delivery movement with ambulance assignment, ETA, route updates, delays, arrival, and transport notes.',
    },
    {
        title: 'Coordinator',
        text: 'Monitor all active cases, resolve delays, escalate SLA breaches, and reassign dispatcher coverage.',
    },
    {
        title: 'Admin',
        text: 'Maintain the department system, users, hospitals, settings, and records.',
    },
];

const differentiators = [
    {
        title: 'A dedicated rejected-patient department',
        text: 'CareBridge is built for the exact moment a person cannot be accepted because a hospital is already full.',
    },
    {
        title: 'Placement before abandonment',
        text: 'The workflow helps staff find another accepting hospital instead of leaving the patient or family to search manually.',
    },
    {
        title: 'Delivery is part of the work',
        text: 'The case does not stop at acceptance. The department monitors delivery, arrival, and handoff.',
    },
    {
        title: 'Not a full hospital record system',
        text: 'It is a focused operational safety net for rejection scenarios, not a full EHR, ERP, or general hospital record system.',
    },
];

export default function Landing({ theme, toggleTheme }) {
    return (
        <div className="landing-page">
            <section className="landing-hero">
                <img src="/images/landing-hero.png" alt="" className="landing-hero-image" />
                <div className="landing-hero-shade"></div>
                <div className="landing-nav">
                    <div className="landing-brand">
                        <img src="/images/carebridge-logo.svg" alt="CareBridge" />
                    </div>
                    <div className="landing-nav-actions">
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <Link to="/login">Sign In</Link>
                        <Link to="/signup" className="landing-nav-button">Create Account</Link>
                    </div>
                </div>

                <div className="landing-hero-content">
                    <p className="landing-kicker">Rejected patient placement department</p>
                    <h1>CareBridge</h1>
                    <p>
                        A focused department workspace for patients who may be rejected because a hospital is full, helping staff find acceptance, reserve capacity, and monitor delivery until handoff.
                    </p>

                    <div className="landing-actions">
                        <Link to="/login" className="landing-cta landing-cta-primary">
                            <span>Sign In</span>
                            <strong>Open dashboard</strong>
                        </Link>
                        <Link to="/signup" className="landing-cta landing-cta-secondary">
                            <span>Create Account</span>
                            <strong>Join your hospital</strong>
                        </Link>
                    </div>

                    <div className="landing-stats">
                        {stats.map((stat) => (
                            <div key={stat.label}>
                                <strong>{stat.value}</strong>
                                <span>{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="landing-next">
                    <span>Rejected intake</span>
                    <span>Placement matching</span>
                    <span>Delivery monitoring</span>
                    <span>Audit logs</span>
                </div>
            </section>

            <section className="landing-section landing-overview">
                <div className="landing-section-header">
                    <p className="landing-section-kicker">What it manages</p>
                    <h2>Built like a focused department for rejected patients</h2>
                    <p>Keep placement, acceptance, reserved capacity, delivery, and handoff visible in one shared workspace.</p>
                </div>
                <div className="landing-feature-grid">
                    {features.map((feature) => (
                        <div className="landing-feature" key={feature.title}>
                            <span>{feature.number}</span>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="landing-section landing-scenario">
                <div className="landing-section-header">
                    <p className="landing-section-kicker">The real problem</p>
                    <h2>When a hospital is full, the next step should not be a manual search.</h2>
                    <p>CareBridge turns rejection into a structured placement case with clear ownership from intake to delivery completion.</p>
                </div>
                <div className="landing-scenario-grid">
                    {scenario.map((item) => (
                        <div className="landing-scenario-card" key={item.title}>
                            <span>{item.label}</span>
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="landing-section landing-workflow-band">
                <div className="landing-section-header">
                    <p className="landing-section-kicker">Workflow</p>
                    <h2>From rejection to safe handoff without losing context</h2>
                    <p>Every case follows a simple department path, with decisions and status changes logged along the way.</p>
                </div>
                <div className="landing-timeline">
                    {workflow.map((item, index) => (
                        <div className="landing-timeline-item" key={item}>
                            <span>{index + 1}</span>
                            <p>{item}</p>
                        </div>
                    ))}
                </div>
                <div className="landing-status-track" aria-label="CareBridge placement status path">
                    {statusPath.map((status) => (
                        <span key={status}>{status}</span>
                    ))}
                </div>
            </section>

            <section className="landing-section">
                <div className="landing-section-header">
                    <p className="landing-section-kicker">Access by role</p>
                    <h2>Each role has a separate responsibility</h2>
                    <p>CareBridge separates intake, acceptance, delivery movement, coordination oversight, and administrative governance.</p>
                </div>
                <div className="landing-role-grid">
                    {roles.map((role) => (
                        <div className="landing-role-card" key={role.title}>
                            <h3>{role.title}</h3>
                            <p>{role.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="landing-section landing-different">
                <div className="landing-section-header">
                    <p className="landing-section-kicker">Why this idea is different</p>
                    <h2>CareBridge is built as a rejected-patient placement and delivery department.</h2>
                    <p>When a hospital is full, people can be rejected, delayed, or redirected without a clear next step. This system focuses on that moment: finding acceptance, reserving the right capacity, and tracking delivery until care is handed off.</p>
                </div>
                <div className="landing-different-grid">
                    {differentiators.map((item) => (
                        <div className="landing-different-card" key={item.title}>
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="landing-section landing-assurance">
                <div>
                    <p className="landing-section-kicker">Operational confidence</p>
                    <h2>Designed for calm decisions during high-pressure routing</h2>
                </div>
                <div className="landing-assurance-grid">
                    <div>
                        <strong>Placement reservations</strong>
                        <p>Reserved cases consume matching bed capacity so availability stays realistic.</p>
                    </div>
                    <div>
                        <strong>Scoped visibility</strong>
                        <p>Staff see cases involving their hospital while coordinators and admins get the department view.</p>
                    </div>
                    <div>
                        <strong>Action history</strong>
                        <p>Case status changes are recorded for review and operational handoff.</p>
                    </div>
                </div>
            </section>

            <section className="landing-final">
                <h2>Give rejected patient placement a clearer department workflow.</h2>
                <p>Use a demo account or create a hospital staff account to explore intake, acceptance, dispatch, coordination, and admin views.</p>
                <div className="landing-actions landing-final-actions">
                    <Link to="/login" className="landing-cta landing-cta-primary">
                        <span>Sign In</span>
                        <strong>Use demo access</strong>
                    </Link>
                    <Link to="/signup" className="landing-cta landing-cta-secondary landing-cta-light">
                        <span>Create Account</span>
                        <strong>Register staff</strong>
                    </Link>
                </div>
            </section>
        </div>
    );
}
