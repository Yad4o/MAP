/**
 * frontend/src/api/client.ts
 * ───────────────────────────
 * Axios instance shared by all API modules.
 *
 * Phase 0: Client configured. Interceptors defined as stubs.
 * Phase 1: Fill in the auth interceptor to attach JWT + handle refresh.
 */

import axios, { AxiosInstance, AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request Interceptor ───────────────────────────────────────
// Attaches the JWT access token to every request.
// Phase 1: Read token from Zustand store and attach here.

apiClient.interceptors.request.use(
  (config) => {
    // TODO Phase 1: attach access token from auth store
    // const token = useAuthStore.getState().accessToken;
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────
// Handles 401 responses by attempting a token refresh.
// Phase 1: Implement token refresh flow here.

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // TODO Phase 1: attempt token refresh, retry original request
      // If refresh fails, clear auth state and redirect to /login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
