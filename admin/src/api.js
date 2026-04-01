/**
 * Admin API client
 * A07: logout blacklists token on server before clearing localStorage
 * A05: timeout reduced; consistent error handling
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL:  API_URL,
    timeout:  15000,
    headers:  { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// Attach Bearer token from localStorage on every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// On 401 — clear credentials and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// A07: call server logout so token is blacklisted, then clear local state
export const adminLogout = async () => {
    try {
        await api.post('/auth/logout');
    } catch (_) { /* ignore network errors — still clear local */ }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
};

export default api;
