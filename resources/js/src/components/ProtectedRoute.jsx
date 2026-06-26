import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUser, homeForRole, roleCanAccess } from '../utils/roles';

export default function ProtectedRoute({ children, allowedRoles }) {
    const token = localStorage.getItem('carebridge_token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const user = getUser();
    if (!roleCanAccess(user.role, allowedRoles)) {
        return <Navigate to={homeForRole(user.role)} replace />;
    }

    return children;
}
