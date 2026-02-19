import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const runtimeApiBase = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:5000/api`
    : 'http://localhost:5000/api';

const envApiBase = import.meta.env.VITE_API_URL?.trim();
const browserHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isRemoteBrowserHost = !['localhost', '127.0.0.1', '::1'].includes(browserHost);
const isLocalhostEnvApi = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(envApiBase || '');
const apiBaseUrl = (isRemoteBrowserHost && isLocalhostEnvApi) ? runtimeApiBase : (envApiBase || runtimeApiBase);

const api = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true, // For cookies (refresh token)
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Attach Tenant Context if available
        const organizationId = useAuthStore.getState().organization?.id;
        if (organizationId) {
            // Ideally specific header or just rely on backend resolving it from token if scoped.
            // But if we have switching logic, we might need a header if token isn't scoped yet.
            // Backend `RequireTenant` checks token first.
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt Refresh
                // We use a separate axios instance or raw fetch to avoid infinite loops if refresh fails?
                // Actually, the main instance is fine if the refresh endpoint doesn't require auth header.
                // But /refresh needs the cookie.

                const { data } = await axios.post(
                    `${apiBaseUrl}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                useAuthStore.getState().setToken(data.accessToken);

                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
