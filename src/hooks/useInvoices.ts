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
  fetchInvoiceVatSummary,
  fetchInvoiceGapReport,
  fetchInvoicePayments,
  recordInvoicePayment,
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  evaluateWorkflow,
  analyzeFraud,
  fetchFraudAlert,
  resolveFraud,
} from '../api/invoices.api';
import type {
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoiceFilterParams,
  CreateInvoiceItemPayload,
  UpdateInvoiceItemPayload,
  RecordPaymentPayload,
  CreateProductPayload,
  UpdateProductPayload,
  ResolveFraudPayload,
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
// VAT summary — breakdown by rate type (read-only)
// ───────────────────────────────────────────
export function useInvoiceVatSummary(invoiceId: string) {
  return useQuery({
    queryKey: ['invoices', 'vat-summary', invoiceId],
    queryFn: () => fetchInvoiceVatSummary(invoiceId),
    enabled: !!invoiceId,
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
// Gap report — UAE Article 70 sequence-gap audit (per company)
// ───────────────────────────────────────────
export function useInvoiceGapReport(companyId: string) {
  return useQuery({
    queryKey: ['invoices', 'gap-report', companyId],
    queryFn: () => fetchInvoiceGapReport(companyId),
    enabled: !!companyId,
  });
}

// ───────────────────────────────────────────
// Product catalog — list (global + company) / create / update / delete.
// This app only manages company-scoped products; global items are admin-managed
// and shown read-only.
// ───────────────────────────────────────────
export const productKeys = {
  list: (companyId: string) => ['products', companyId] as const,
};

export function useProducts(companyId: string) {
  return useQuery({
    queryKey: productKeys.list(companyId),
    queryFn: () => fetchProducts({ company_id: companyId }),
    enabled: !!companyId,
  });
}

export function useCreateProduct(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.list(companyId) });
    },
  });
}

export function useUpdateProduct(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: UpdateProductPayload }) =>
      updateProduct(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.list(companyId) });
    },
  });
}

export function useDeleteProduct(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.list(companyId) });
    },
  });
}

// ───────────────────────────────────────────
// Payments (supplier side) — history + record.
// Recording a payment changes amount_paid / balance_due / status on the
// invoice, so it invalidates the invoice detail and lists too.
// ───────────────────────────────────────────
export function useInvoicePayments(invoiceId: string) {
  return useQuery({
    queryKey: ['invoices', 'payments', invoiceId],
    queryFn: () => fetchInvoicePayments(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useRecordPayment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordPaymentPayload) => recordInvoicePayment(invoiceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'payments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.allLists });
    },
  });
}

// ───────────────────────────────────────────
// Workflow automation + per-invoice fraud detection
// ───────────────────────────────────────────
export function useEvaluateWorkflow(invoiceId: string) {
  return useMutation({
    mutationFn: () => evaluateWorkflow(invoiceId),
  });
}

export function useFraudAlert(invoiceId: string) {
  return useQuery({
    queryKey: ['invoices', 'fraud', invoiceId],
    queryFn: () => fetchFraudAlert(invoiceId),
    enabled: !!invoiceId,
    retry: false,
  });
}

export function useAnalyzeFraud(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => analyzeFraud(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'fraud', invoiceId] });
    },
  });
}

export function useResolveFraud(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ResolveFraudPayload) => resolveFraud(invoiceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'fraud', invoiceId] });
    },
  });
}