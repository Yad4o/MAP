/**
 * frontend/src/api/client.ts
 * ───────────────────────────
 * Axios instance shared by all API modules.
 *
 * Phase 0: Client configured. Interceptors defined as stubs.
 * Phase 1: Fill in the auth interceptor to attach JWT + handle refresh.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from '../store/authStore';
import { AxiosHeaders } from 'axios';


let envBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (envBaseUrl) {
  envBaseUrl = envBaseUrl.replace(/\/+$/, ''); // strip trailing slashes first
  if (!envBaseUrl.endsWith('/api/v1')) {
    envBaseUrl += '/api/v1';
  }
}

const BASE_URL =
  envBaseUrl ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    common: {
      'Content-Type': 'application/json',
    },
  },
});
 
export default apiClient;

let refreshPromise: Promise<{ access_token: string; refresh_token: string }> | null = null;

// ── Request Interceptor ───────────────────────────────────────
// Attaches the JWT access token to every request.
// Phase 1: Read token from Zustand store and attach here.

apiClient.interceptors.request.use(
  (config) => {
    // Prevent absolute path override: if url starts with '/', strip it so it appends to baseURL
    if (config.url && config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }
    
    const token = useAuthStore.getState().accessToken;
    const headers = AxiosHeaders.from(config.headers);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers = headers;
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
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    // Attach access token from Zustand auth store
    // If refresh fails, clear auth state and redirect to /login
    // Only handle 401s; propagate everything else immediately.
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }
     // If this request was already retried once, the refresh itself is broken
    // (revoked token, rate-limit, server bug). Clear auth and redirect rather
    // than looping forever.
    if (originalRequest._retry) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    // Don't attempt a refresh if the failing request was itself an auth endpoint
    // (avoids infinite loops on bad credentials or an expired refresh token).
    // failing request was itself an auth endpoint — that would be circular.
    const originalUrl: string = originalRequest.url ?? '';
    if (
      originalUrl.includes('/auth/login') ||
      originalUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }
 
    // Stamp the request *before* any await so concurrent 401s see the flag.
    originalRequest._retry = true;
    
    try {
      const refreshToken = useAuthStore.getState().refreshToken
 
      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
        // Lazy-import authApi to defer circular dependency:
        //   client.ts → authStore.ts → auth.ts → client.ts
        // Import happens at runtime inside promise, not at module load
            const { authApi } = await import('./auth');
            return await authApi.refreshToken(refreshToken);
          } finally {
            // Always clear so the next refresh cycle gets a fresh promise.
            refreshPromise = null;
          }
        })();
      }
 
      // Lazy-import authApi to avoid a circular-dependency between client ↔ auth.
      const newTokens = await refreshPromise;
      useAuthStore.getState().setTokens(
        newTokens.access_token,
        newTokens.refresh_token
      );
 
      // Retry the original request with the fresh access token.
    originalRequest.headers = new AxiosHeaders(originalRequest.headers);
    originalRequest.headers.set('Authorization', `Bearer ${newTokens.access_token}`);
 
      return apiClient(originalRequest);
    } catch (err) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      // Fix #8: Reject with the original 401 error, not the refresh error,
      // so callers receive the correct context for debugging.
      return Promise.reject(error);
    }
  }
);
