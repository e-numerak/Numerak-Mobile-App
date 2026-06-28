import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCompanies,
  createCompany,
  fetchCompany,
  updateCompany,
  deleteCompany,
  fetchMembers,
  addMember,
  fetchMember,
  updateMember,
  removeMember,
} from '../api/companies.api';
import type {
  CreateCompanyPayload,
  UpdateCompanyPayload,
  AddMemberPayload,
  UpdateMemberPayload,
} from '../types/company.types';

// ───────────────────────────────────────────
// Query keys — centralized so invalidation stays consistent
// ───────────────────────────────────────────
export const companyKeys = {
  all: ['companies'] as const,
  detail: (companyId: string) => ['companies', companyId] as const,
  members: (companyId: string) => ['companies', companyId, 'members'] as const,
  member: (companyId: string, memberId: string) =>
    ['companies', companyId, 'members', memberId] as const,
};

// ───────────────────────────────────────────
// Companies — list / create
// ───────────────────────────────────────────

export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.all,
    queryFn: fetchCompanies,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCompanyPayload) => createCompany(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

// ───────────────────────────────────────────
// Company detail — get / update / delete
// ───────────────────────────────────────────

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: companyKeys.detail(companyId),
    queryFn: () => fetchCompany(companyId),
    enabled: !!companyId,
  });
}

export function useUpdateCompany(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCompanyPayload) => updateCompany(companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => deleteCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

// ───────────────────────────────────────────
// Members — list / add
// ───────────────────────────────────────────

export function useCompanyMembers(companyId: string) {
  return useQuery({
    queryKey: companyKeys.members(companyId),
    queryFn: () => fetchMembers(companyId),
    enabled: !!companyId,
  });
}

export function useAddMember(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddMemberPayload) => addMember(companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.members(companyId) });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) }); // member_count changes
    },
  });
}

// ───────────────────────────────────────────
// Member detail — get / update / remove
// ───────────────────────────────────────────

export function useCompanyMember(companyId: string, memberId: string) {
  return useQuery({
    queryKey: companyKeys.member(companyId, memberId),
    queryFn: () => fetchMember(companyId, memberId),
    enabled: !!companyId && !!memberId,
  });
}

export function useUpdateMember(companyId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMemberPayload) => updateMember(companyId, memberId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.members(companyId) });
    },
  });
}

export function useRemoveMember(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(companyId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.members(companyId) });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) }); // member_count changes
    },
  });
}