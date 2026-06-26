import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const stats = [
    { value: '7', label: 'Transfer states tracked' },
    { value: '4', label: 'Role-aware workspaces' },
    { value: '24/7', label: 'Operations visibility' },
];

const features = [
    {
        number: '01',
        title: 'Capacity Awareness',
        text: 'View available general, emergency, ICU, and ambulance capacity before sending a transfer request.',
    },
    {
        number: '02',
        title: 'Request Workflow',
        text: 'Move requests from pending to accepted, reserved, in transfer, completed, declined, or cancelled with clear ownership.',
    },
    {
        number: '03',
        title: 'Operational Analytics',
        text: 'Monitor request volume, urgency, case type, transfer timing, and completion performance across the network.',
    },
];

const workflow = [
    'Sending hospital creates a request',
    'Receiving hospital accepts or declines',
    'Capacity is reserved for the matching case type',
    'Transfer starts, completes, and is logged',
];

const roles = [
    {
        title: 'Sending Staff',
        text: 'Create transfer requests and start reserved transfers from your hospital.',
    },
    {
        title: 'Receiving Staff',
        text: 'Review incoming requests, reserve capacity, and complete accepted transfers.',
    },
    {
        title: 'Coordinator',
        text: 'Watch the full transfer picture and coordinate status updates across hospitals.',
    },
    {
        title: 'Admin',
        text: 'Maintain system-level visibility and operational configuration.',
    },
];

const differentiators = [
    {
        title: 'Built for patients rejected by full hospitals',
        text: 'The system is for people who cannot be accepted because a hospital is already full, not for choosing a better hospital by preference.',
    },
    {
        title: 'Find capacity before turning people away',
        text: 'Hospitals can see which nearby facilities still have matching bed capacity before rejecting or delaying care.',
    },
    {
        title: 'Full-hospital coordination',
        text: 'The workflow starts when one hospital is full and needs a receiving hospital that can accept the person safely.',
    },
    {
        title: 'A focused safety net',
        text: 'It is a lightweight coordination layer for capacity rejection scenarios, not a replacement for a full hospital record system.',
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
                    <p className="landing-kicker">Hospital capacity coordination</p>
                    <h1>CareBridge</h1>
                    <p>
                        A focused command workspace for people who may be rejected because a hospital is full, helping staff find available capacity across partner hospitals.
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
                    <span>Live capacity</span>
                    <span>Transfer tracking</span>
                    <span>Role-based access</span>
                    <span>Audit logs</span>
                </div>
            </section>

            <section className="landing-section landing-overview">
                <div className="landing-section-header">
                    <p className="landing-section-kicker">What it manages</p>
                    <h2>Built for fast hospital coordination</h2>
                    <p>Keep the transfer workflow visible from request to completion, with each hospital seeing the work that belongs to them.</p>
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

            <section className="landing-section landing-workflow-band">
                <div className="landing-section-header">
                    <p className="landing-section-kicker">Workflow</p>
                    <h2>From request to completion without losing context</h2>
                    <p>Every transfer follows a simple operational path, with status changes logged along the way.</p>
                </div>
                <div className="landing-timeline">
                    {workflow.map((item, index) => (
                        <div className="landing-timeline-item" key={item}>
                            <span>{index + 1}</span>
                            <p>{item}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="landing-section">
                <div className="landing-section-header">
                    <p className="landing-section-kicker">Access by role</p>
                    <h2>Each team gets the controls they need</h2>
                    <p>CareBridge separates sending, receiving, coordination, and administrative responsibilities.</p>
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
                    <h2>CareBridge is built for capacity rejection, not elective transfer.</h2>
                    <p>When a hospital is full, people can be rejected, delayed, or redirected without a clear shared view of available capacity. This system focuses on that moment: finding a receiving hospital, reserving the right capacity, and tracking the status until care is handed off.</p>
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
                        <strong>Capacity reservations</strong>
                        <p>Reserved transfers consume matching bed capacity so availability stays realistic.</p>
                    </div>
                    <div>
                        <strong>Scoped visibility</strong>
                        <p>Staff see transfers involving their hospital while coordinators and admins get broader context.</p>
                    </div>
                    <div>
                        <strong>Action history</strong>
                        <p>Transfer status changes are recorded for review and operational handoff.</p>
                    </div>
                </div>
            </section>

            <section className="landing-final">
                <h2>Start coordinating capacity-based care with a clearer view.</h2>
                <p>Use a demo account or create a hospital staff account to explore the workflow.</p>
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
