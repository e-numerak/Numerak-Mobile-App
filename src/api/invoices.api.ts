import apiClient from './client';
import { INVOICE_ENDPOINTS } from '../constants/api';
import type {
  Invoice,
  InvoiceListItem,
  InvoiceItem,
  Product,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoiceFilterParams,
  PaginatedInvoices,
  CreateInvoiceItemPayload,
  UpdateInvoiceItemPayload,
  InvoiceValidationResult,
  InvoiceVatSummary,
  InvoiceDashboardStats,
  InvoiceGapReport,
  InvoiceExportParams,
  InvoicePayment,
  RecordPaymentPayload,
  InvoiceDraftAutosave,
  SaveDraftAutosavePayload,
  InvoiceFormType,
  CreateProductPayload,
  UpdateProductPayload,
  ProductFilterParams,
} from '../types/invoice.types';

// ───────────────────────────────────────────
// NOTE: draft-autosave endpoint isn't in constants/api.ts yet.
// Ideally add this to INVOICE_ENDPOINTS there:
//   draftAutosave: `${API_URL}/invoices/draft-autosave/`,
// Derived locally for now so nothing breaks if it's added later with the
// exact same value.
// ───────────────────────────────────────────
const DRAFT_AUTOSAVE_URL = `${INVOICE_ENDPOINTS.list}draft-autosave/`;

// ═══════════════════════════════════════════
// Invoice CRUD
// ═══════════════════════════════════════════

export const fetchInvoices = async (
  params: InvoiceFilterParams
): Promise<PaginatedInvoices> => {
  // Supplier list response is { success, results, pagination } at the top level.
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.list, { params });
  return {
    results: data.results ?? [],
    pagination: data.pagination ?? { count: 0 },
  };
};

export const createInvoice = async (
  payload: CreateInvoicePayload
): Promise<Invoice> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.list, payload);
  return data.data ?? data;
};

export const fetchInvoice = async (invoiceId: string): Promise<Invoice> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.detail(invoiceId));
  return data.data ?? data;
};

export const updateInvoice = async (
  invoiceId: string,
  payload: UpdateInvoicePayload
): Promise<Invoice> => {
  const { data } = await apiClient.put(INVOICE_ENDPOINTS.detail(invoiceId), payload);
  return data.data ?? data;
};

export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  await apiClient.delete(INVOICE_ENDPOINTS.detail(invoiceId));
};

// ═══════════════════════════════════════════
// Status transitions
// ═══════════════════════════════════════════

export const submitInvoice = async (invoiceId: string): Promise<Invoice> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.submit(invoiceId));
  return data.data ?? data;
};

export const cancelInvoice = async (invoiceId: string): Promise<Invoice> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.cancel(invoiceId));
  return data.data ?? data;
};

export const deactivateInvoice = async (
  invoiceId: string,
  reason?: string
): Promise<Invoice> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.deactivate(invoiceId), { reason });
  return data.data ?? data;
};

export const createCreditNote = async (invoiceId: string): Promise<Invoice> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.creditNote(invoiceId));
  return data.data ?? data;
};

// ═══════════════════════════════════════════
// Validation & FTA
// ═══════════════════════════════════════════

export const validateInvoice = async (
  invoiceId: string
): Promise<InvoiceValidationResult> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.validate(invoiceId));
  return data.data ?? data;
};

// [ADMIN] only — kept here for completeness, not used in the supplier-facing app.
export const reportInvoiceToFta = async (
  invoiceId: string
): Promise<{ task_id: string; invoice_number: string }> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.reportFta(invoiceId));
  return data.data ?? data;
};

// ═══════════════════════════════════════════
// Downloads
// File-saving / sharing (expo-file-system, expo-sharing) ke saath integrate
// hoga Downloads step mein. Abhi sirf raw binary response fetch karta hai.
// ═══════════════════════════════════════════

export const downloadInvoiceXml = async (invoiceId: string): Promise<Blob> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.downloadXml(invoiceId), {
    responseType: 'blob',
  });
  return data;
};

export const downloadInvoicePdf = async (invoiceId: string): Promise<Blob> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.downloadPdf(invoiceId), {
    responseType: 'blob',
  });
  return data;
};

export const fetchInvoiceVatSummary = async (
  invoiceId: string
): Promise<InvoiceVatSummary> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.vatSummary(invoiceId));
  return data.data ?? data;
};

// ═══════════════════════════════════════════
// Line items
// ═══════════════════════════════════════════

export const fetchInvoiceItems = async (invoiceId: string): Promise<InvoiceItem[]> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.items(invoiceId));
  return data.data ?? data;
};

export const addInvoiceItem = async (
  invoiceId: string,
  payload: CreateInvoiceItemPayload
): Promise<InvoiceItem> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.items(invoiceId), payload);
  return data.data ?? data;
};

export const updateInvoiceItem = async (
  invoiceId: string,
  itemId: string,
  payload: UpdateInvoiceItemPayload
): Promise<InvoiceItem> => {
  const { data } = await apiClient.put(
    INVOICE_ENDPOINTS.itemDetail(invoiceId, itemId),
    payload
  );
  return data.data ?? data;
};

export const deleteInvoiceItem = async (
  invoiceId: string,
  itemId: string
): Promise<void> => {
  await apiClient.delete(INVOICE_ENDPOINTS.itemDetail(invoiceId, itemId));
};

// ═══════════════════════════════════════════
// Dashboard / Export / Gap report
// ═══════════════════════════════════════════

export const fetchInvoiceDashboard = async (
  companyId: string
): Promise<InvoiceDashboardStats> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.dashboard, {
    params: { company_id: companyId },
  });
  return data.data ?? data;
};

export const exportInvoicesCsv = async (
  params: InvoiceExportParams
): Promise<Blob> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.export, {
    params,
    responseType: 'blob',
  });
  return data;
};

export const fetchInvoiceGapReport = async (
  companyId: string
): Promise<InvoiceGapReport> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.gapReport, {
    params: { company_id: companyId },
  });
  return data.data ?? data;
};

// ═══════════════════════════════════════════
// Payments (supplier side) — PROVISIONAL, see invoice.types.ts note
// ═══════════════════════════════════════════

export const fetchInvoicePayments = async (
  invoiceId: string
): Promise<InvoicePayment[]> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.payments(invoiceId));
  return data.data ?? data;
};

export const recordInvoicePayment = async (
  invoiceId: string,
  payload: RecordPaymentPayload
): Promise<InvoicePayment> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.payments(invoiceId), payload);
  return data.data ?? data;
};

// ═══════════════════════════════════════════
// Draft autosave (server scratchpad)
// ═══════════════════════════════════════════

export const fetchDraftAutosave = async (
  companyId: string,
  formType: InvoiceFormType = 'pint'
): Promise<InvoiceDraftAutosave> => {
  const { data } = await apiClient.get(DRAFT_AUTOSAVE_URL, {
    params: { company_id: companyId, form_type: formType },
  });
  return data.data ?? data;
};

export const saveDraftAutosave = async (
  payload: SaveDraftAutosavePayload
): Promise<void> => {
  await apiClient.put(DRAFT_AUTOSAVE_URL, payload);
};

export const deleteDraftAutosave = async (
  companyId: string,
  formType: InvoiceFormType = 'pint'
): Promise<void> => {
  await apiClient.delete(DRAFT_AUTOSAVE_URL, {
    params: { company_id: companyId, form_type: formType },
  });
};

// ═══════════════════════════════════════════
// Product catalog — /api/v1/invoices/products/
// ═══════════════════════════════════════════

export const fetchProducts = async (params: ProductFilterParams): Promise<Product[]> => {
  const { data } = await apiClient.get(INVOICE_ENDPOINTS.products, { params });
  return data.data ?? data;
};

export const createProduct = async (payload: CreateProductPayload): Promise<Product> => {
  const { data } = await apiClient.post(INVOICE_ENDPOINTS.products, payload);
  return data.data ?? data;
};

export const updateProduct = async (
  productId: string,
  payload: UpdateProductPayload
): Promise<Product> => {
  const { data } = await apiClient.put(INVOICE_ENDPOINTS.productDetail(productId), payload);
  return data.data ?? data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await apiClient.delete(INVOICE_ENDPOINTS.productDetail(productId));
};