import { create } from 'zustand';
import apiClient from '../api/client';
import { AUTH_ENDPOINTS } from '../constants/api';
import { tokenStorage } from '../utils/tokenStorage';

interface User {
  id: string;
  email: string;
  first_name: string;    
  last_name: string;     
  role: string; 
  [key: string]: unknown;
}

type LoginResult = 'success' | 'mfa_setup_required' | 'mfa_required';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthLoading: boolean;
  error: string | null;

  // MFA flow state
  mfaSetupRequired: boolean;
  mfaRequired: boolean;
  setupToken: string | null;
  mfaToken: string | null;
  qrUri: string | null;
  secret: string | null;

  // Actions
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (payload: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  clearError: () => void;
  mfaSetup: () => Promise<void>;
  mfaEnable: (code: string) => Promise<void>;
  mfaVerify: (code: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthLoading: false,
  error: null,

  mfaSetupRequired: false,
  mfaRequired: false,
  setupToken: null,
  mfaToken: null,
  qrUri: null,
  secret: null,

  loadStoredAuth: async () => {
    try {
      const accessToken = await tokenStorage.getAccessToken();
      if (!accessToken) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }
      const { data } = await apiClient.get(AUTH_ENDPOINTS.me);
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch (err) {
      await tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // ─────────────────────────────────────
  // Login — 3 possible outcomes
  // ─────────────────────────────────────
  login: async (email: string, password: string) => {
    set({ isAuthLoading: true, error: null });
    try {
      const { data } = await apiClient.post(AUTH_ENDPOINTS.login, { email, password });
      const body = data.data;

      // Case 1: fully logged in
      if (body.access) {
        await tokenStorage.setTokens(body.access, body.refresh);
        set({
          user: body.user,
          isAuthenticated: true,
          isAuthLoading: false,
          mfaSetupRequired: false,
          mfaRequired: false,
        });
        return 'success';
      }

      // Case 2: first-time MFA setup
      if (body.mfa_setup_required) {
        set({
          mfaSetupRequired: true,
          setupToken: body.setup_token,
          isAuthLoading: false,
        });
        return 'mfa_setup_required';
      }

      // Case 3: MFA verify (24hr window expired)
      if (body.mfa_required) {
        set({
          mfaRequired: true,
          mfaToken: body.mfa_token,
          isAuthLoading: false,
        });
        return 'mfa_required';
      }

      throw new Error('Unexpected login response shape');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error?.message ??
        err?.response?.data?.detail ??
        'Login failed. Please try again.';
      set({ error: message, isAuthLoading: false });
      throw err;
    }
  },

  register: async (payload: Record<string, unknown>) => {
    set({ isAuthLoading: true, error: null });
    try {
      await apiClient.post(AUTH_ENDPOINTS.register, payload);
      set({ isAuthLoading: false });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Registration failed. Please try again.';
      set({ error: message, isAuthLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        await apiClient.post(AUTH_ENDPOINTS.logout, { refresh: refreshToken });
      }
    } catch (err) {
    } finally {
      await tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false, mfaSetupRequired: false, mfaRequired: false });
    }
  },

  clearError: () => set({ error: null }),

  // ─────────────────────────────────────
  // MFA — first-time setup
  // ─────────────────────────────────────
  mfaSetup: async () => {
    const { setupToken } = get();
    if (!setupToken) throw new Error('No setup token found');
    set({ isAuthLoading: true, error: null });
    try {
      const { data } = await apiClient.post(AUTH_ENDPOINTS.mfaSetupLogin, {
        setup_token: setupToken,
      });
      set({ qrUri: data.data.qr_uri, secret: data.data.secret, isAuthLoading: false });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Could not start MFA setup.';
      set({ error: message, isAuthLoading: false });
      throw err;
    }
  },

  mfaEnable: async (code: string) => {
    const { setupToken } = get();
    if (!setupToken) throw new Error('No setup token found');
    set({ isAuthLoading: true, error: null });
    try {
      const { data } = await apiClient.post(AUTH_ENDPOINTS.mfaEnableLogin, {
        setup_token: setupToken,
        code,
      });
      const body = data.data;
      await tokenStorage.setTokens(body.access, body.refresh);
      set({
        user: body.user,
        isAuthenticated: true,
        isAuthLoading: false,
        mfaSetupRequired: false,
        setupToken: null,
        qrUri: null,
        secret: null,
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Invalid code. Try again.';
      set({ error: message, isAuthLoading: false });
      throw err;
    }
  },

  // ─────────────────────────────────────
  // MFA — 24hr re-verify
  // ─────────────────────────────────────
  mfaVerify: async (code: string) => {
    const { mfaToken } = get();
    if (!mfaToken) throw new Error('No MFA token found');
    set({ isAuthLoading: true, error: null });
    try {
      const { data } = await apiClient.post(AUTH_ENDPOINTS.mfaVerifyLogin, {
        mfa_token: mfaToken,
        code,
      });
      const body = data.data;
      await tokenStorage.setTokens(body.access, body.refresh);
      set({
        user: body.user,
        isAuthenticated: true,
        isAuthLoading: false,
        mfaRequired: false,
        mfaToken: null,
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Invalid code. Try again.';
      set({ error: message, isAuthLoading: false });
      throw err;
    }
  },
}));