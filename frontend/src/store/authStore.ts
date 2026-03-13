/**
 * frontend/src/store/authStore.ts
 * ────────────────────────────────
 * Zustand store for authentication state.
 *
 * Phase 0: Store shape defined. Actions are stubs.
 * Phase 1: Fill in login/logout actions using authApi.
 *
 * Tokens are stored in memory only (never localStorage).
 * This protects against XSS token theft.
 */

import { create } from "zustand";
import type { UserResponse } from "../types";

interface AuthState {
  // ── State ────────────────────────────────────────────────
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // ── Actions ───────────────────────────────────────────────
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // ── Initial State ─────────────────────────────────────────
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,

  // ── Actions (implement in Phase 1) ────────────────────────

  login: async (email: string, password: string) => {
    // TODO Phase 1:
    // 1. Call authApi.login({ email, password })
    // 2. Call setTokens with the returned pair
    // 3. Call authApi.getMe() to fetch user profile
    // 4. Call setUser with the profile
    throw new Error("Phase 1 — implement this");
  },

  logout: async () => {
    // TODO Phase 1:
    // 1. Call authApi.logout()
    // 2. Call clearAuth()
    throw new Error("Phase 1 — implement this");
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  setUser: (user) => {
    set({ user });
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
