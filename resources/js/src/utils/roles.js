export const roleHome = {
    sending_staff: '/create-transfer',
    receiving_staff: '/incoming-requests',
    coordinator: '/coordinator-board',
    dispatcher: '/transfer-tracking',
    admin: '/admin',
};

export const roleLabels = {
    sending_staff: 'Intake Staff',
    receiving_staff: 'Acceptance Staff',
    coordinator: 'Coordinator',
    dispatcher: 'Dispatcher',
    admin: 'Admin',
};

export const getUser = () => JSON.parse(localStorage.getItem('carebridge_user') || '{}');

export const homeForRole = (role) => roleHome[role] || '/dashboard';

export const roleLabel = (role) => roleLabels[role] || (role ? role.replace('_', ' ') : 'User');

export const roleCanAccess = (role, allowedRoles) => !allowedRoles || allowedRoles.includes(role);
