import React from 'react';

const icons = {
    dashboard: (
        <>
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </>
    ),
    capacity: (
        <>
            <path d="M4 18V7.5" />
            <path d="M20 18v-5.5a3 3 0 0 0-3-3H9v8.5" />
            <path d="M4 12.5h16" />
            <path d="M7 9.5h2" />
            <path d="M4 18h16" />
        </>
    ),
    intake: (
        <>
            <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9" />
            <path d="M14 3.5v5h5" />
            <path d="M12 13v5" />
            <path d="M9.5 15.5h5" />
        </>
    ),
    inbox: (
        <>
            <path d="M4 13.5 6.2 6h11.6L20 13.5" />
            <path d="M4 13.5v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4h-4a4 4 0 0 1-8 0H4Z" />
        </>
    ),
    tracking: (
        <>
            <circle cx="10.5" cy="10.5" r="5.5" />
            <path d="m15 15 5 5" />
            <path d="M8.5 10.5h4" />
        </>
    ),
    ambulance: (
        <>
            <path d="M3.5 16.5V8a2 2 0 0 1 2-2h8.5v10.5" />
            <path d="M14 10h3.2l3.3 3.5v3h-2" />
            <path d="M7 16.5h7" />
            <circle cx="6" cy="17" r="1.7" />
            <circle cx="18" cy="17" r="1.7" />
            <path d="M9 8.5v4" />
            <path d="M7 10.5h4" />
        </>
    ),
    route: (
        <>
            <circle cx="6" cy="6" r="2.2" />
            <circle cx="18" cy="18" r="2.2" />
            <path d="M8 6h3.5a3.5 3.5 0 0 1 0 7H10a3.5 3.5 0 0 0 0 7h6" />
        </>
    ),
    command: (
        <>
            <rect x="3.5" y="4" width="5" height="16" rx="1.5" />
            <rect x="10.5" y="4" width="5" height="10" rx="1.5" />
            <rect x="17.5" y="4" width="3" height="7" rx="1.2" />
        </>
    ),
    wallboard: (
        <>
            <rect x="3.5" y="4.5" width="17" height="11.5" rx="2" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
            <path d="M7.5 12.5 10 10l2 1.7 4-4.2" />
        </>
    ),
    directory: (
        <>
            <path d="M4.5 20V5.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V20" />
            <path d="M8 8h1.5" />
            <path d="M8 11.5h1.5" />
            <path d="M8 15h1.5" />
            <path d="M13 20v-4h3.5" />
            <path d="M4 20h16" />
        </>
    ),
    analytics: (
        <>
            <path d="M4 20V4" />
            <path d="M4 20h16" />
            <rect x="7" y="11" width="3" height="6" rx="1" />
            <rect x="12" y="7" width="3" height="10" rx="1" />
            <rect x="17" y="13" width="3" height="4" rx="1" />
        </>
    ),
    admin: (
        <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3.8 19a5.2 5.2 0 0 1 10.4 0" />
            <path d="M17.5 10.5v6" />
            <path d="M14.5 13.5h6" />
        </>
    ),
    shield: (
        <>
            <path d="M12 3.5 19 6v5.5c0 4.2-2.8 7.2-7 9-4.2-1.8-7-4.8-7-9V6l7-2.5Z" />
            <path d="m9 12 2 2 4-4" />
        </>
    ),
    audit: (
        <>
            <path d="M8 4.5h8l2 2v13H6v-15h2Z" />
            <path d="M9 10h6" />
            <path d="M9 13.5h6" />
            <path d="M9 17h3" />
        </>
    ),
    settings: (
        <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.8 7.8 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
        </>
    ),
    cases: (
        <>
            <rect x="5" y="4" width="14" height="16" rx="2" />
            <path d="M8.5 8h7" />
            <path d="M8.5 12h7" />
            <path d="M8.5 16h4" />
        </>
    ),
    pending: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 7.5V12l3 2" />
        </>
    ),
    accepted: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="m8.5 12.3 2.2 2.2 4.8-5" />
        </>
    ),
    arrived: (
        <>
            <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
            <path d="m9.4 11.2 1.7 1.7 3.5-3.8" />
        </>
    ),
    completed: (
        <>
            <path d="M20 7 9 18l-5-5" />
            <path d="M4 19.5h16" />
        </>
    ),
    declined: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="m9 9 6 6" />
            <path d="m15 9-6 6" />
        </>
    ),
    waiting: (
        <>
            <path d="M7 3.5h10" />
            <path d="M7 20.5h10" />
            <path d="M8 3.5c0 4 4 4.5 4 8.5s-4 4.5-4 8.5" />
            <path d="M16 3.5c0 4-4 4.5-4 8.5s4 4.5 4 8.5" />
        </>
    ),
    delayed: (
        <>
            <path d="M12 4 21 20H3L12 4Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </>
    ),
    assigned: (
        <>
            <circle cx="9" cy="8" r="3" />
            <path d="M4 19a5 5 0 0 1 9.5-2.2" />
            <path d="m15 17 2 2 4-5" />
        </>
    ),
    unassigned: (
        <>
            <path d="M4 13.5 6.2 6h11.6L20 13.5" />
            <path d="M4 13.5v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            <path d="M9 10h6" />
        </>
    ),
    eta: (
        <>
            <circle cx="12" cy="13" r="7" />
            <path d="M12 13 15.5 10" />
            <path d="M9 3.5h6" />
            <path d="M12 3.5V6" />
        </>
    ),
};

export default function AppIcon({ name, className = '' }) {
    const content = icons[name] || icons.dashboard;

    return (
        <svg className={`app-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {content}
        </svg>
    );
}
