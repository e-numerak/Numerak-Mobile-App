import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProfile,
  updateProfile,
  changePassword,
  type UpdateProfilePayload,
  type ChangePasswordPayload,
} from '../api/profile.api';
import { useAuthStore } from '../store/authStore';

export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (updated) => {
      // Keep the cached profile and the global auth user (drawer header) in sync.
      queryClient.setQueryData(profileKeys.me, updated);
      useAuthStore.setState({ user: updated as any });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
  });
}
