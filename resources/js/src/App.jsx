import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { getUser, homeForRole } from './utils/roles';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const HospitalCapacity = lazy(() => import('./pages/HospitalCapacity'));
const CreateTransfer = lazy(() => import('./pages/CreateTransfer'));
const IncomingRequests = lazy(() => import('./pages/IncomingRequests'));
const TransferTracking = lazy(() => import('./pages/TransferTracking'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TransferDetail = lazy(() => import('./pages/TransferDetail'));
const CoordinatorBoard = lazy(() => import('./pages/CoordinatorBoard'));
const DispatcherBoard = lazy(() => import('./pages/DispatcherBoard'));
const HospitalDirectory = lazy(() => import('./pages/HospitalDirectory'));
const AdminManagement = lazy(() => import('./pages/AdminManagement'));
const RoleMatrix = lazy(() => import('./pages/RoleMatrix'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Wallboard = lazy(() => import('./pages/Wallboard'));
const SignUp = lazy(() => import('./pages/SignUp'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Settings = lazy(() => import('./pages/Settings'));

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
            <Suspense fallback={<div className="loading route-loading">Loading CareBridge...</div>}>
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
                    path="/intake"
                    element={
                        <ProtectedRoute allowedRoles={['sending_staff']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><CreateTransfer /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/create-transfer"
                    element={<Navigate to="/intake" replace />}
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
                    path="/placement-tracking"
                    element={
                        <ProtectedRoute>
                            <Layout theme={theme} toggleTheme={toggleTheme}><TransferTracking /></Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/transfer-tracking"
                    element={<Navigate to="/placement-tracking" replace />}
                />
                <Route
                    path="/placement-cases/:id"
                    element={
                        <ProtectedRoute>
                            <Layout theme={theme} toggleTheme={toggleTheme}><TransferDetail /></Layout>
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
                    path="/dispatcher-board"
                    element={
                        <ProtectedRoute allowedRoles={['dispatcher']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><DispatcherBoard /></Layout>
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
                    path="/wallboard"
                    element={
                        <ProtectedRoute allowedRoles={['coordinator', 'dispatcher', 'admin']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><Wallboard /></Layout>
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
                    path="/role-matrix"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Layout theme={theme} toggleTheme={toggleTheme}><RoleMatrix /></Layout>
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
            </Suspense>
        </BrowserRouter>
    );
}

export default App;
