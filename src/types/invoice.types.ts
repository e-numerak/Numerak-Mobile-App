// ───────────────────────────────────────────
// Invoice module types
// Source of truth: apps/common/constants.py, apps/invoices/{models,serializers}.py
// ───────────────────────────────────────────

// ───────────────────────────────────────────
// Enums (exact string values — match backend constants.py)
// ───────────────────────────────────────────

export type InvoiceType =
  | 'tax_invoice'        // Standard B2B/B2G (TypeCode 380)
  | 'credit_note'        // Article 65 amendment (TypeCode 381)
  | 'commercial_invoice' // Commercial Invoice (TypeCode 480, non-VAT)
  | 'continuous_supply'  // Continuous Supplies (TypeCode 380 + period)
  | 'simplified';         // B2C simplified (future)

export type TransactionType = 'b2b' | 'b2g' | 'b2c';

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'processing'
  | 'submitted'
  | 'validated'
  | 'rejected'
  | 'cancelled'
  | 'paid'
  | 'partially_paid'
  | 'deactivated';

export type Currency = 'AED' | 'USD' | 'EUR';

export type VatRateType = 'standard' | 'zero' | 'exempt' | 'out_of_scope';

export type PaymentMeansCode =
  | '10' // Cash
  | '20' // Cheque
  | '30' // Credit Transfer (default)
  | '48' // Bank Card
  | '49' // Direct Debit
  | '57' // Standing Order
  | '58'; // SEPA Credit Transfer

// NOTE: fta_status / fta_reference / fta_reported_at exist on the Invoice model
// but are NOT included in InvoiceSerializer's `fields` list — so they never
// come back in any /invoices/ response. Don't add them to the Invoice type
// below; they only matter on the [ADMIN] side which is out of scope for this app.

// ───────────────────────────────────────────
// InvoiceItem — matches InvoiceItemSerializer (full, read)
// ───────────────────────────────────────────
export interface InvoiceItem {
  id: string;
  item_name: string;
  description: string;
  quantity: string;             // DecimalField → backend sends as string
  unit: string;
  unit_price: string;           // DecimalField → string
  vat_rate_type: VatRateType;
  vat_rate_type_display: string;
  vat_rate: string;             // e.g. "5.00"
  subtotal: string;
  vat_amount: string;
  total_amount: string;
  sort_order: number;
  is_active: boolean;
}

// Body for POST /invoices/{id}/items/  — matches InvoiceItemCreateSerializer
export interface CreateInvoiceItemPayload {
  item_name?: string;
  product_reference?: string;   // agar pehle se nahi hai
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  vat_rate_type?: VatRateType;
  tax_code?: string;        // NEW
  debit_amount?: number;    // NEW
  credit_amount?: number;   // NEW
  sort_order?: number;
}

// Body for PUT /invoices/{id}/items/{item_id}/ — matches InvoiceItemUpdateSerializer
// All optional, but backend requires at least one field present.
export interface UpdateInvoiceItemPayload {
  item_name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  vat_rate_type?: VatRateType;
  sort_order?: number;
}

// Same shape used inline when creating an invoice with items in one call
export type InlineInvoiceItemPayload = CreateInvoiceItemPayload;

// ───────────────────────────────────────────
// Invoice — matches InvoiceSerializer (full, read — GET /invoices/{id}/)
// ───────────────────────────────────────────
export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  type_display: string;
  transaction_type: TransactionType;
  status: InvoiceStatus;
  status_display: string;

  // Supplier (our company) — denormalized read-only fields
  company_name: string;
  company_trn: string;
  company_trn_issue_date: string | null;
  company_trn_expiry_date: string | null;
  company_logo: string | null;

  // Buyer (customer) — FK id + denormalized read-only fields
  customer: string;             // Customer UUID
  customer_name: string;
  customer_trn: string;
  customer_trn_issue_date: string | null;
  customer_trn_expiry_date: string | null;
  customer_address: string;
  customer_city: string;
  customer_country: string;
  customer_phone: string;
  customer_email: string;
  customer_logo: string | null;

  // Dates
  issue_date: string;
  due_date: string | null;
  supply_date: string | null;
  supply_date_end: string | null;

  // Continuous supply
  contract_reference: string;

  // Financial
  currency: Currency;
  exchange_rate: string;
  subtotal: string;
  discount_amount: string;
  taxable_amount: string;
  total_vat: string;
  total_amount: string;

  // Payment / AR
  payment_means_code: PaymentMeansCode;
  amount_paid: string;
  balance_due: string;
  is_overdue: boolean;
  days_overdue: number;

  // References
  reference_number: string;
  purchase_order_number: string;

  // XML / ASP
  xml_file: string | null;
  xml_generated_at: string | null;
  asp_submission_id: string;
  asp_submitted_at: string | null;

  // Items
  items: InvoiceItem[];
  item_count: number;

  // Action flags — drive which buttons are shown on the detail screen
  is_editable: boolean;
  is_submittable: boolean;
  is_cancellable: boolean;
  is_deactivatable: boolean;

  // Deactivation
  deactivation_reason: string;
  deactivated_at: string | null;

  // Buyer engagement
  buyer_viewed_at: string | null;

  notes: string;
  created_at: string;
  updated_at: string;
}

// ───────────────────────────────────────────
// InvoiceListItem — matches InvoiceListSerializer (lightweight, GET list)
// ───────────────────────────────────────────
export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  type_display: string;
  status: InvoiceStatus;
  status_display: string;
  customer: string;
  customer_name: string;
  issue_date: string;
  due_date: string | null;
  currency: Currency;
  subtotal: string;
  total_vat: string;
  total_amount: string;
  item_count: number;
  has_xml: boolean;
  buyer_viewed_at: string | null;
  created_at: string;
}

// ───────────────────────────────────────────
// Create / Update payloads — match InvoiceCreateSerializer / InvoiceUpdateSerializer
// ───────────────────────────────────────────
export interface CreateInvoicePayload {
  company_id: string;
  customer_id: string;
  invoice_type?: InvoiceType;          // default 'tax_invoice'
  transaction_type?: TransactionType;  // default 'b2b'
  issue_date?: string;
  due_date?: string;
  supply_date?: string;                // required if invoice_type === 'continuous_supply'
  supply_date_end?: string;            // required if invoice_type === 'continuous_supply'
  contract_reference?: string;
  currency?: Currency;                 // default 'AED'
  discount_amount?: number;            // default 0.00
  payment_means_code?: PaymentMeansCode; // default '30'
  reference_number?: string;           // required if invoice_type === 'credit_note'
  purchase_order_number?: string;
  notes?: string;
  items?: InlineInvoiceItemPayload[];  // optional — create items in the same call
}

// At least one field must be provided (enforced server-side)
export interface UpdateInvoicePayload {
  customer_id?: string;
  invoice_type?: InvoiceType;
  transaction_type?: TransactionType;
  issue_date?: string;
  due_date?: string;
  supply_date?: string;
  supply_date_end?: string | null;
  contract_reference?: string;
  currency?: Currency;
  discount_amount?: number;
  payment_means_code?: PaymentMeansCode;
  reference_number?: string;
  purchase_order_number?: string;
  notes?: string;
}

// ───────────────────────────────────────────
// List filters — matches InvoiceFilterSerializer
// ───────────────────────────────────────────
export interface InvoiceFilterParams {
  company_id: string;           // required
  status?: InvoiceStatus;
  customer_id?: string;
  invoice_type?: InvoiceType;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// ───────────────────────────────────────────
// Paginated list response
// Supplier endpoint returns { success, results, pagination: { count, ... } }
// at the top level (confirmed against the web client). The count lives under
// `pagination.count`, NOT at the root.
// ───────────────────────────────────────────
export interface InvoicePagination {
  count: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
}

export interface PaginatedInvoices {
  results: InvoiceListItem[];
  pagination: InvoicePagination;
}

// ───────────────────────────────────────────
// Validate — POST /invoices/{id}/validate/ response
// ───────────────────────────────────────────
export interface InvoiceValidationResult {
  invoice_number: string;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  peppol_errors: string[];
  peppol_warnings: string[];
  can_submit: boolean;
}

// ───────────────────────────────────────────
// VAT Summary — GET /invoices/{id}/vat-summary/ response
// ASSUMPTION: vat_breakdown entry shape is inferred (VATCalculationService
// source not seen yet). Confirm/fix when we reach the Downloads + VAT
// Summary step.
// ───────────────────────────────────────────
export interface VatBreakdownEntry {
  vat_rate_type: VatRateType;
  vat_rate: string;
  taxable_amount: string;
  vat_amount: string;
}

export interface InvoiceVatSummary {
  invoice_number: string;
  currency: Currency;
  subtotal: string;
  discount: string;
  taxable_amount: string;
  total_vat: string;
  total_amount: string;
  vat_breakdown: VatBreakdownEntry[];
}

// ───────────────────────────────────────────
// Dashboard — GET /invoices/dashboard/ response
// ───────────────────────────────────────────
export interface InvoiceDashboardStats {
  company_id: string;
  company_name: string;
  total_invoices: number;
  status_breakdown: Partial<Record<InvoiceStatus, number>>;
  total_revenue: string;
  total_vat: string;
}

// ───────────────────────────────────────────
// Gap report — GET /invoices/gap-report/ response
// ASSUMPTION: `gaps` item shape not confirmed (InvoiceNumberService.detect_gaps
// source not seen yet). Confirm when we reach the Dashboard/Export/Gap-report step.
// ───────────────────────────────────────────
export interface InvoiceGap {
  expected_sequence: number;
  found_after?: string;   // invoice_number before the gap
  found_before?: string;  // invoice_number after the gap
}

export interface InvoiceGapReport {
  company: string;
  company_trn: string;
  gap_count: number;
  gaps: InvoiceGap[];
  compliant: boolean;
  message: string;
}

// ───────────────────────────────────────────
// CSV export filters — matches the list filters minus pagination
// ───────────────────────────────────────────
export interface InvoiceExportParams {
  company_id: string;
  status?: InvoiceStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// ───────────────────────────────────────────
// Payments (supplier side) — PROVISIONAL, no model/serializer seen yet.
// Shape inferred from PDF doc body: { amount, method, payment_date, reference?, notes? }.
// Confirm against the real Payment model/serializer at the Payments step.
// ───────────────────────────────────────────
export interface InvoicePayment {
  id: string;
  amount: string;
  method: string;
  payment_date: string;
  reference: string;
  notes: string;
  created_at: string;
}

export interface RecordPaymentPayload {
  amount: number;
  method: string;
  payment_date: string;
  reference?: string;
  notes?: string;
}

// ───────────────────────────────────────────
// Draft autosave — matches InvoiceDraftSerializer
// ───────────────────────────────────────────
export type InvoiceFormType = 'pint' | 'new';

export interface InvoiceDraftAutosave {
  exists: boolean;
  payload?: Record<string, unknown>;
  updated_at?: string;
}

export interface SaveDraftAutosavePayload {
  company_id: string;
  form_type: InvoiceFormType;
  payload: Record<string, unknown>;
}

// ───────────────────────────────────────────
// Product catalog — matches ProductSerializer + ProductListCreateView/ProductDetailView
//
// Confirmed from views.py: `is_global` is an [ADMIN]-only, website-side
// concept (raw request field, not even in ProductSerializer) — this app
// never sends it and never creates/edits global items. Every product this
// app creates is company-scoped, so `company_id` is required on create.
// Edit/delete of a company item is allowed for any authenticated user of
// that company (not company-admin-restricted on the backend).
// ───────────────────────────────────────────
export type ProductScope = 'global' | 'company';

export interface Product {
  id: string;
  name: string;
  description: string;
  unit_price: string;
  vat_rate_type: VatRateType;
  unit: string;
  is_active: boolean;
  company: string | null;       // null = global item (read-only, admin-managed — never created by this app)
  scope: ProductScope;
  created_at: string;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  unit_price: number;
  vat_rate_type?: VatRateType;  // default 'standard'
  unit?: string;
  company_id: string;           // required — this app only creates company-scoped products
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  unit_price?: number;
  vat_rate_type?: VatRateType;
  unit?: string;
  is_active?: boolean;
}

export interface ProductFilterParams {
  company_id: string;
}

// ───────────────────────────────────────────
// Fraud detection — matches InvoiceFraudAlert (per-invoice)
// ───────────────────────────────────────────
export type FraudRiskLevel = 'low' | 'medium' | 'high';
export type FraudAutoAction = 'none' | 'flag' | 'block' | 'approve';

export interface FraudFlag {
  code: string;
  description: string;
  severity?: string;
  category?: string;
}

export interface FraudAlert {
  id: string;
  risk_score: number;            // 0.0 – 1.0
  risk_level: FraudRiskLevel;
  auto_action: FraudAutoAction;
  flags_json: FraudFlag[];
  duplicate_invoice_ids: string[];
  ai_explanation: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_note: string;
  analyzed_at: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface ResolveFraudPayload {
  resolution_note?: string;
}

// ───────────────────────────────────────────
// Workflow automation — POST /invoices/{id}/workflow/evaluate/
// Exact shape not confirmed; `action` is the documented key.
// ───────────────────────────────────────────
export interface WorkflowResult {
  action: string;
  reason?: string;
  [key: string]: unknown;
}