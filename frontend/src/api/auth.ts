/**
 * frontend/src/api/auth.ts
 * ─────────────────────────
 * All auth-related API calls.
 * Phase 1: These will call real backend once auth routes are implemented.
 * Until then, they throw — the MSW mock handler intercepts them first.
 */

import apiClient from "./client";
import type {
  LoginRequest,
  RegisterRequest,
  TokenPair,
  UpdateProfileRequest,
  UserResponse,
  ChangePasswordRequest,
} from "../types";

export const authApi = {
  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const res = await apiClient.post("/auth/register", data);
    return res.data;
  },

  login: async (data: LoginRequest): Promise<TokenPair> => {
    const res = await apiClient.post("/auth/login", data);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  getMe: async (): Promise<UserResponse> => {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },

  updateMe: async (data: UpdateProfileRequest): Promise<UserResponse> => {
    const res = await apiClient.patch("/auth/me", data);
    return res.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post("/auth/change-password", data);
  },

  refreshToken: async (refreshToken: string): Promise<TokenPair> => {
    const res = await apiClient.post("/auth/refresh", {}, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    return res.data;
  },
};
