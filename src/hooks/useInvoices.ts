import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchInvoices,
  createInvoice,
  fetchInvoice,
  updateInvoice,
  deleteInvoice,
  submitInvoice,
  cancelInvoice,
  deactivateInvoice,
  createCreditNote,
  validateInvoice,
  fetchInvoiceItems,
  addInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  fetchInvoiceDashboard,
} from '../api/invoices.api';
import type {
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoiceFilterParams,
  CreateInvoiceItemPayload,
  UpdateInvoiceItemPayload,
} from '../types/invoice.types';

// ───────────────────────────────────────────
// Query keys
//
// NOTE: unlike customerKeys.list(companyId) (keyed only on company_id),
// here the *entire* filter object is part of the key. Invoice list has many
// independent filters (status, customer_id, invoice_type, dates, search,
// page) and they all need to trigger their own fetch/cache entry — keying
// on company_id alone would mean switching a filter doesn't refetch.
// ───────────────────────────────────────────
export const invoiceKeys = {
  allLists: ['invoices', 'list'] as const,
  list: (params: InvoiceFilterParams) => ['invoices', 'list', params] as const,
  detail: (invoiceId: string) => ['invoices', 'detail', invoiceId] as const,
  items: (invoiceId: string) => ['invoices', 'items', invoiceId] as const,
};

// ───────────────────────────────────────────
// List — scoped to a company (company_id is required by backend)
// ───────────────────────────────────────────
export function useInvoices(params: InvoiceFilterParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => fetchInvoices(params),
    enabled: !!params.company_id,
  });
}

// ───────────────────────────────────────────
// Create
// ───────────────────────────────────────────
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => createInvoice(payload),
    onSuccess: () => {
      // Broad invalidation — simplest correct option since list queries are
      // keyed by their full filter object (see note above).
      queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
    },
  });
}

// ───────────────────────────────────────────
// Detail — get / update / delete
// ───────────────────────────────────────────
export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(invoiceId),
    queryFn: () => fetchInvoice(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useUpdateInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInvoicePayload) => updateInvoice(invoiceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => deleteInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
    },
  });
}

// ───────────────────────────────────────────
// Status transitions
// ───────────────────────────────────────────
export function useSubmitInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
    },
  });
}

export function useCancelInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
    },
  });
}

export function useDeactivateInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => deactivateInvoice(invoiceId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
    },
  });
}

export function useCreateCreditNote(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createCreditNote(invoiceId),
    onSuccess: () => {
      // A new invoice (the credit note) is created — refresh lists.
      queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
  });
}

// ───────────────────────────────────────────
// Validate — no state change, just a check. No cache invalidation needed.
// ───────────────────────────────────────────
export function useValidateInvoice(invoiceId: string) {
  return useMutation({
    mutationFn: () => validateInvoice(invoiceId),
  });
}

// ───────────────────────────────────────────
// Line items — list / add / update / delete (DRAFT invoices only).
// Every mutation invalidates BOTH the items list AND the invoice detail,
// because adding/editing/removing an item recalculates the invoice totals
// server-side (subtotal / total_vat / total_amount).
// ───────────────────────────────────────────
export function useInvoiceItems(invoiceId: string) {
  return useQuery({
    queryKey: invoiceKeys.items(invoiceId),
    queryFn: () => fetchInvoiceItems(invoiceId),
    enabled: !!invoiceId,
  });
}

function useInvalidateItemsAndDetail(invoiceId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: invoiceKeys.items(invoiceId) });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
  };
}

export function useAddInvoiceItem(invoiceId: string) {
  const invalidate = useInvalidateItemsAndDetail(invoiceId);
  return useMutation({
    mutationFn: (payload: CreateInvoiceItemPayload) => addInvoiceItem(invoiceId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateInvoiceItem(invoiceId: string) {
  const invalidate = useInvalidateItemsAndDetail(invoiceId);
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateInvoiceItemPayload }) =>
      updateInvoiceItem(invoiceId, itemId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteInvoiceItem(invoiceId: string) {
  const invalidate = useInvalidateItemsAndDetail(invoiceId);
  return useMutation({
    mutationFn: (itemId: string) => deleteInvoiceItem(invoiceId, itemId),
    onSuccess: invalidate,
  });
}

// ───────────────────────────────────────────
// Dashboard — per-company invoice stats
// ───────────────────────────────────────────
export function useInvoiceDashboard(companyId: string) {
  return useQuery({
    queryKey: ['invoices', 'dashboard', companyId],
    queryFn: () => fetchInvoiceDashboard(companyId),
    enabled: !!companyId,
  });
}

// ───────────────────────────────────────────
// Products / Payments / Export / Gap-report /
// Draft-autosave / Workflow / Fraud hooks will be appended here as we reach
// their respective steps.
// ───────────────────────────────────────────