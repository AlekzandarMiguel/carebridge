import React from 'react';
import { Link } from 'react-router-dom';
import { roleProfiles } from '../utils/roles';

const roles = ['sending_staff', 'receiving_staff', 'dispatcher', 'coordinator', 'admin'];

export default function RoleMatrix() {
    return (
        <div>
            <div className="feature-hero">
                <div>
                    <span>Role Governance</span>
                    <h2>Role Matrix</h2>
                    <p>Review exactly what each CareBridge role is responsible for, what pages they use, and where their permissions stop.</p>
                </div>
                <div className="hero-metrics">
                    <div><strong>{roles.length}</strong><small>Roles</small></div>
                    <div><strong>5</strong><small>Work lanes</small></div>
                    <div><strong>Clear</strong><small>Boundaries</small></div>
                </div>
            </div>

            <div className="role-matrix-page">
                {roles.map((role) => {
                    const profile = roleProfiles[role];

                    return (
                        <article className={`role-matrix-detail role-${role}`} key={role}>
                            <div className="role-matrix-detail-head">
                                <div>
                                    <span>{profile.home}</span>
                                    <h3>{profile.label}</h3>
                                </div>
                                <Link className="btn btn-outline btn-sm" to={profile.home}>Open Work Lane</Link>
                            </div>
                            <p>{profile.purpose}</p>
                            <div className="role-matrix-detail-grid">
                                <section>
                                    <strong>Pages</strong>
                                    <div className="settings-role-pages">
                                        {profile.pages.map((page) => <span key={page}>{page}</span>)}
                                    </div>
                                </section>
                                <section>
                                    <strong>Allowed actions</strong>
                                    <ul>
                                        {profile.actions.map((item) => <li key={item}>{item}</li>)}
                                    </ul>
                                </section>
                                <section>
                                    <strong>Boundaries</strong>
                                    <ul>
                                        {profile.boundaries.map((item) => <li key={item}>{item}</li>)}
                                    </ul>
                                </section>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
