/**
 * frontend/src/store/authStore.ts
 * ────────────────────────────────
 * Zustand store for authentication state.
 *
 * Phase 0: Store shape defined. Actions are stubs.
 * Phase 1: Fill in login/logout actions using authApi.
 *
 * Persisted: Tokens and user info are stored in localStorage to survive page refreshes.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi } from "../api/auth";
import { getApiErrorMessage } from "../lib/errors";
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── Initial State ─────────────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Actions ───────────────────────────────────────────────

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          // Call the login API
          const tokenPair = await authApi.login({ email, password });
          // Store tokens (will be persisted by middleware)
          get().setTokens(tokenPair.access_token, tokenPair.refresh_token);
          // Fetch the user profile
          const user = await authApi.getMe();
          // Store the user
          get().setUser(user);
        } catch (error) {
          const errorMessage = getApiErrorMessage(error);
          set({ error: errorMessage });
          get().clearAuth();
          throw new Error(errorMessage);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
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
    }),
    {
      name: "map-auth-storage", // unique name for the storage
      storage: createJSONStorage(() => localStorage),
      // Only persist the following fields:
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
