import apiClient from './client';
import { AUTH_ENDPOINTS } from '../constants/api';

// ───────────────────────────────────────────
// User profile — backed by /api/v1/auth/me/
// ───────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: string;
  is_active?: boolean;
  email_verified?: boolean;
  date_joined?: string;
  last_login?: string;
  [key: string]: unknown;
}

export const fetchProfile = async (): Promise<UserProfile> => {
  const { data } = await apiClient.get(AUTH_ENDPOINTS.me);
  // /auth/me returns the user object directly (no { data } wrapper).
  return data.data ?? data;
};

// Web sends only first/last name; email & role are read-only.
export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
}

export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<UserProfile> => {
  const { data } = await apiClient.put(AUTH_ENDPOINTS.me, payload);
  return data.data ?? data;
};

// ───────────────────────────────────────────
// Change password — POST /api/v1/auth/change-password/
// ───────────────────────────────────────────
export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
}

export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  await apiClient.post(AUTH_ENDPOINTS.changePassword, payload);
};
