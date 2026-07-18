/**
 * frontend/src/api/client.ts
 * ───────────────────────────
 * Axios instance shared by all API modules.
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

export const BASE_URL =
  envBaseUrl ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    common: {
      'Content-Type': 'application/json',
    },
  },
});
 
export default apiClient;

let refreshPromise: Promise<{ access_token: string; refresh_token: string }> | null = null;

apiClient.interceptors.request.use(
  (config) => {
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const originalUrl: string = originalRequest.url ?? '';
    if (
      originalUrl.includes('auth/login') ||
      originalUrl.includes('auth/refresh')
    ) {
      return Promise.reject(error);
    }
 
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
            const { authApi } = await import('./auth');
            return await authApi.refreshToken(refreshToken);
          } finally {
            refreshPromise = null;
          }
        })();
      }
 
      const newTokens = await refreshPromise;
      useAuthStore.getState().setTokens(
        newTokens.access_token,
        newTokens.refresh_token
      );
 
      originalRequest.headers = new AxiosHeaders(originalRequest.headers);
      originalRequest.headers.set('Authorization', `Bearer ${newTokens.access_token}`);
 
      return apiClient(originalRequest);
    } catch (err) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }
  }
);
