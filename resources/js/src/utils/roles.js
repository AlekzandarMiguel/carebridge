export const roleHome = {
    sending_staff: '/intake',
    receiving_staff: '/incoming-requests',
    coordinator: '/coordinator-board',
    dispatcher: '/dispatcher-board',
    admin: '/admin',
};

export const roleLabels = {
    sending_staff: 'Intake Staff',
    receiving_staff: 'Acceptance Staff',
    coordinator: 'Coordinator',
    dispatcher: 'Dispatcher',
    admin: 'Admin',
};

export const roleProfiles = {
    sending_staff: {
        label: 'Intake Staff',
        purpose: 'Receives rejected patient cases and creates the placement case with rejection reason, urgency, required service, documents, and suggested destination.',
        home: '/intake',
        pages: ['Rejected Intake', 'Case Tracking', 'Placement Directory', 'Analytics', 'Settings'],
        actions: [
            'Create rejected patient cases',
            'Add rejection reason and placement need',
            'Use placement matching recommendations',
            'Start delivery after capacity is reserved',
            'Track cases involving their hospital',
        ],
        boundaries: [
            'Cannot accept or reserve capacity for another hospital',
            'Cannot update hospital capacity',
            'Cannot manage users or system settings',
        ],
    },
    receiving_staff: {
        label: 'Acceptance Staff',
        purpose: 'Reviews cases sent to their hospital, accepts or declines, reserves capacity, updates own capacity, marks arrival, and completes handoff.',
        home: '/incoming-requests',
        pages: ['Capacity Desk', 'Acceptance Queue', 'Case Tracking', 'Analytics', 'Settings'],
        actions: [
            'Maintain own hospital capacity',
            'Accept or decline incoming placement cases',
            'Reserve matching beds',
            'Mark patient arrival',
            'Complete incoming handoff',
        ],
        boundaries: [
            'Cannot create rejected patient cases',
            'Cannot edit other hospitals capacity',
            'Cannot assign dispatchers',
        ],
    },
    dispatcher: {
        label: 'Dispatcher',
        purpose: 'Owns delivery movement after acceptance: ambulance assignment, ETA, route updates, location updates, delays, and arrival progress.',
        home: '/dispatcher-board',
        pages: ['Dispatcher Board', 'Wallboard', 'Placement Directory', 'Analytics', 'Settings'],
        actions: [
            'Claim or assign active delivery cases',
            'Maintain ambulance, driver/contact, pickup, ETA, and route details',
            'Post location and delay updates',
            'Monitor delivery risks',
            'Keep delivery timeline current',
        ],
        boundaries: [
            'Cannot accept, decline, or reserve capacity',
            'Cannot update hospital capacity',
            'Cannot manage users or system settings',
        ],
    },
    coordinator: {
        label: 'Coordinator',
        purpose: 'Watches all active cases, resolves delays, escalates SLA breaches, reassigns dispatchers, and oversees stuck cases without acting as hospital staff.',
        home: '/coordinator-board',
        pages: ['Command View', 'Wallboard', 'Placement Directory', 'Analytics', 'Audit Logs', 'Settings'],
        actions: [
            'Monitor all active placement cases',
            'Escalate long-wait and high-risk cases',
            'Assign or reassign dispatchers',
            'Add coordinator notes',
            'Review operational analytics and audit trails',
        ],
        boundaries: [
            'Does not accept or decline for hospitals',
            'Does not directly reserve capacity',
            'Can update delivery monitoring only with an audit reason',
        ],
    },
    admin: {
        label: 'Admin',
        purpose: 'Manages users, hospitals, roles, settings, audit logs, demo configuration, and overall system governance.',
        home: '/admin',
        pages: ['Admin', 'Command View', 'Wallboard', 'Placement Directory', 'Analytics', 'Audit Logs', 'Settings'],
        actions: [
            'Manage users, hospitals, account status, and role assignments',
            'Review audit logs and system-wide activity',
            'Maintain system settings and demo data',
            'Review and explain the role matrix',
            'View command and delivery boards',
            'Perform governed overrides with audit reason',
        ],
        boundaries: [
            'Should not perform routine hospital acceptance work',
            'Can override only when documented',
            'Does not replace department workflow ownership',
        ],
    },
};

export const getUser = () => JSON.parse(localStorage.getItem('carebridge_user') || '{}');

export const homeForRole = (role) => roleHome[role] || '/dashboard';

export const roleLabel = (role) => roleLabels[role] || (role ? role.replace('_', ' ') : 'User');

export const roleProfile = (role) => roleProfiles[role] || {
    label: roleLabel(role),
    purpose: 'Review assigned CareBridge work.',
    home: homeForRole(role),
    pages: ['Dashboard', 'Settings'],
    actions: ['Access assigned workflows'],
    boundaries: ['Follow assigned role permissions'],
};

export const roleCanAccess = (role, allowedRoles) => !allowedRoles || allowedRoles.includes(role);
