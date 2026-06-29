import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCustomers,
  createCustomer,
  fetchCustomer,
  updateCustomer,
  deleteCustomer,
} from '../api/customers.api';
import type {
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerFilterParams,
} from '../types/customer.types';

// ───────────────────────────────────────────
// Query keys
// ───────────────────────────────────────────
export const customerKeys = {
  list: (companyId: string) => ['customers', companyId] as const,
  detail: (customerId: string) => ['customers', 'detail', customerId] as const,
};

// ───────────────────────────────────────────
// List — scoped to a company (company_id is required by backend)
// ───────────────────────────────────────────
export function useCustomers(params: CustomerFilterParams) {
  return useQuery({
    queryKey: customerKeys.list(params.company_id),
    queryFn: () => fetchCustomers(params),
    enabled: !!params.company_id,
  });
}

// ───────────────────────────────────────────
// Create
// ───────────────────────────────────────────
export function useCreateCustomer(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.list(companyId) });
    },
  });
}

// ───────────────────────────────────────────
// Detail — get / update / delete
// ───────────────────────────────────────────
export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: customerKeys.detail(customerId),
    queryFn: () => fetchCustomer(customerId),
    enabled: !!customerId,
  });
}

export function useUpdateCustomer(customerId: string, companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCustomerPayload) => updateCustomer(customerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.list(companyId) });
    },
  });
}

export function useDeleteCustomer(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.list(companyId) });
    },
  });
}