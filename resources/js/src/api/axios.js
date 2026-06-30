import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Attach token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('carebridge_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 - redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('carebridge_token');
            localStorage.removeItem('carebridge_user');
            if (!error.config?.url?.includes('/auth/logout')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getAuthOptions = () => api.get('/auth/options');
export const register = (data) => api.post('/auth/register', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const getSettings = () => api.get('/auth/settings');
export const updateSettings = (data) => api.put('/auth/settings', data);

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Hospitals
export const getHospitals = () => api.get('/hospitals');
export const getHospitalCapacity = (id) => api.get(`/hospitals/${id}/capacity`);
export const updateHospitalCapacity = (id, data) => api.put(`/hospitals/${id}/capacity`, data);

// Transfer Requests
export const getTransferRequests = (page = 1, filters = {}) => api.get('/transfer-requests', { params: { page, ...filters } });
export const getTransferRecommendations = (caseType = 'general') => api.get('/transfer-recommendations?case_type=' + caseType);
export const createTransferRequest = (data) => api.post('/transfer-requests', data);
export const getTransferRequest = (id) => api.get(`/transfer-requests/${id}`);
export const exportTransferRequests = (filters = {}) => api.get('/transfer-requests/export', { params: filters, responseType: 'blob' });
export const getWallboard = () => api.get('/wallboard');

// Incoming Requests
export const getIncomingRequests = () => api.get('/incoming-requests');

// Transfer Actions
export const acceptTransfer = (id) => api.put(`/transfer-requests/${id}/accept`);
export const acceptTransferWithConditions = (id, accept_conditions = '') => api.put(`/transfer-requests/${id}/accept`, { accept_conditions });
export const declineTransfer = (id, remarks, decline_reason_category = 'other') => api.put(`/transfer-requests/${id}/decline`, { remarks, decline_reason_category });
export const reserveTransfer = (id) => api.put(`/transfer-requests/${id}/reserve`);
export const startTransfer = (id, data = {}) => api.put(`/transfer-requests/${id}/transfer`, data);
export const markPatientArrived = (id) => api.put(`/transfer-requests/${id}/arrive`);
export const completeTransfer = (id, data = {}) => api.put(`/transfer-requests/${id}/complete`, data);
export const cancelTransfer = (id) => api.put(`/transfer-requests/${id}/cancel`);
export const escalateTransfer = (id, reason = 'Coordinator escalation requested.') => api.put(`/transfer-requests/${id}/escalate`, { reason });
export const updateCoordinatorNotes = (id, coordinator_notes = '') => api.put(`/transfer-requests/${id}/coordinator-notes`, { coordinator_notes });
export const assignDispatcher = (id, assigned_dispatcher_id) => api.put(`/transfer-requests/${id}/assign-dispatcher`, { assigned_dispatcher_id });
export const updateRouteEstimate = (id, data = {}) => api.put(`/transfer-requests/${id}/route-estimate`, data);
export const addDeliveryEvent = (id, data = {}) => api.post(`/transfer-requests/${id}/delivery-events`, data);
export const uploadTransferAttachment = (id, data) => api.post(`/transfer-requests/${id}/attachments`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const downloadTransferAttachment = (id, attachmentId) => api.get(`/transfer-requests/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
export const deleteTransferAttachment = (id, attachmentId) => api.delete(`/transfer-requests/${id}/attachments/${attachmentId}`);
export const archiveTransfer = (id, archive_reason = 'Archived from department workflow.') => api.put(`/transfer-requests/${id}/archive`, { archive_reason });
export const unarchiveTransfer = (id) => api.put(`/transfer-requests/${id}/unarchive`);

// Transfer Tracking
export const getTransferTracking = (page = 1, filters = {}) => api.get('/transfer-tracking', { params: { page, ...filters } });
export const getTransferBoard = () => api.get('/transfer-board');

// Notifications
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.post('/notifications/read-all');

// Analytics
export const getAnalytics = () => api.get('/analytics');

// Admin
export const getAdminData = () => api.get('/admin');
export const createAdminUser = (data) => api.post('/admin/users', data);
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const createAdminHospital = (data) => api.post('/admin/hospitals', data);
export const updateAdminHospital = (id, data) => api.put(`/admin/hospitals/${id}`, data);
export const getSystemSettings = () => api.get('/admin/system-settings');
export const updateSystemSettings = (data) => api.put('/admin/system-settings', data);
export const refreshDemoData = () => api.post('/admin/demo-refresh');
export const getAuditLogs = (page = 1, filters = {}) => api.get('/audit-logs', { params: { page, ...filters } });
export const exportAuditLogs = (filters = {}) => api.get('/audit-logs/export', { params: filters, responseType: 'blob' });

export const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export default api;
