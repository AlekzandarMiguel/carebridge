import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HospitalCapacity from './pages/HospitalCapacity';
import CreateTransfer from './pages/CreateTransfer';
import IncomingRequests from './pages/IncomingRequests';
import TransferTracking from './pages/TransferTracking';
import Analytics from './pages/Analytics';
import TransferDetail from './pages/TransferDetail';
import CoordinatorBoard from './pages/CoordinatorBoard';
import HospitalDirectory from './pages/HospitalDirectory';
import AdminManagement from './pages/AdminManagement';
import AuditLogs from './pages/AuditLogs';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import { getUser, homeForRole } from './utils/roles';

function App() {
    const token = localStorage.getItem('carebridge_token');
    const user = getUser();
    const signedInHome = homeForRole(user.role);
    const [theme, setTheme] = useState(() => localStorage.getItem('carebridge_theme') || 'light');

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('carebridge_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((current) => current === 'dark' ? 'light' : 'dark');
    };

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={token ? <Navigate to={signedInHome} replace /> : <Landing theme={theme} toggleTheme={toggleTheme} />}
                />
                <Route
                    path="/login"
                    element={token ? <Navigate to={signedInHome} replace /> : <Login theme={theme} toggleTheme={toggleTheme} />}
                />
                <Route
                    path="/signup"
                    element={token ? <Navigate to={signedInHome} replace /> : <SignUp theme={theme} toggleTheme={toggleTheme} />}
                />
                <Route
                    path="/forgot-password"
                    element={token ? <Navigate to={signedInHome} replace /> : <ForgotPassword theme={theme} toggleTheme={toggleTheme} />}
                />
                <Route
                    path="/reset-password"
                    element={token ? <Navigate to={signedInHome} replace /> : <ResetPassword theme={theme} toggleTheme={toggleTheme} />}
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Layout theme={theme} toggleTheme={toggleTheme}><Dashboard /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/hospital-capacity"
                    element={
                        <ProtectedRoute allowedRoles={['receiving_staff']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><HospitalCapacity /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/create-transfer"
                    element={
                        <ProtectedRoute allowedRoles={['sending_staff']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><CreateTransfer /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/incoming-requests"
                    element={
                        <ProtectedRoute allowedRoles={['receiving_staff']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><IncomingRequests /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/transfer-tracking"
                    element={
                        <ProtectedRoute>
                            <Layout theme={theme} toggleTheme={toggleTheme}><TransferTracking /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/transfer-requests/:id"
                    element={
                        <ProtectedRoute>
                            <Layout theme={theme} toggleTheme={toggleTheme}><TransferDetail /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/coordinator-board"
                    element={
                        <ProtectedRoute allowedRoles={['coordinator', 'dispatcher', 'admin']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><CoordinatorBoard /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/hospital-directory"
                    element={
                        <ProtectedRoute allowedRoles={['sending_staff', 'coordinator', 'dispatcher', 'admin']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><HospitalDirectory /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/analytics"
                    element={
                        <ProtectedRoute allowedRoles={['coordinator', 'dispatcher', 'admin']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><Analytics /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><AdminManagement /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/audit-logs"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><AuditLogs /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Layout theme={theme} toggleTheme={toggleTheme}><Settings /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
