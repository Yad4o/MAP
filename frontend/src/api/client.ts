/**
 * frontend/src/api/client.ts
 * ───────────────────────────
 * Axios instance shared by all API modules.
 *
 * Phase 0: Client configured. Interceptors defined as stubs.
 * Phase 1: Fill in the auth interceptor to attach JWT + handle refresh.
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { useAuthStore } from '../store/authStore';
import type { InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
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
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
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
    if (error.response?.status !== 401) {
      // TODO Phase 1: attempt token refresh, retry original request
      // If refresh fails, clear auth state and redirect to /login
      return Promise.reject(error);
    }
    // Don't attempt a refresh if the failing request was itself an auth endpoint
    // (avoids infinite loops on bad credentials or an expired refresh token).
    const originalUrl: string = error.config?.url ?? ''
    if (
      originalUrl.includes('/auth/login') ||
      originalUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }
 
    try {
      const refreshToken = useAuthStore.getState().refreshToken
 
      if (!refreshToken) {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }
 
      // Lazy-import authApi to avoid a circular-dependency between client ↔ auth.
      const { authApi } = await import('./auth')
      const newTokens = await authApi.refreshToken(refreshToken)
 
      useAuthStore.getState().setTokens(
        newTokens.access_token,
        newTokens.refresh_token
      );
 
      // Retry the original request with the fresh access token.
      if (!error.config){
        return Promise.reject(error);
      }
      
const originalRequest = error.config as InternalAxiosRequestConfig;

originalRequest.headers = originalRequest.headers || {};
originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;

return apiClient(originalRequest);
}  catch (err) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(err);
    }
  }
);
  

