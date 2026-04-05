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
import { authApi } from "../api/auth";
import type { UserResponse } from "../types";

interface AuthState {
  // ── State ────────────────────────────────────────────────
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // ── Actions ───────────────────────────────────────────────
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserResponse) => void;
  clearAuth: () => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // ── Initial State ─────────────────────────────────────────
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // ── Actions (implement in Phase 1) ────────────────────────

  login: async (email: string, password: string) => {
    // TODO Phase 1:
    // 1. Call authApi.login({ email, password })
    // 2. Call setTokens with the returned pair
    // 3. Call authApi.getMe() to fetch user profile
    // 4. Call setUser with profile
    
    try {
      set({ isLoading: true, error: null });
      // Call the login API
      const tokenPair = await authApi.login({ email, password });
      // Store tokens in memory
      get().setTokens(tokenPair.access_token, tokenPair.refresh_token);
      // Fetch the user profile
      const user = await authApi.getMe();
      // Store the user
      get().setUser(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({ error: errorMessage });
      get().clearAuth();
      throw error;
    } finally {
      set({ isLoading: false });
    }
    
  },

  logout: async () => {
    // TODO Phase 1:
    // 1. Call authApi.logout()
    // 2. Call clearAuth()
    try {
      // Try to call logout API
      await authApi.logout();
    } catch {
      // Even if the API call fails, clear local auth state
    } finally {
      // Always clear auth state regardless
      get().clearAuth();
    }
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, isAuthenticated: true, error: null });
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
      error: null,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
