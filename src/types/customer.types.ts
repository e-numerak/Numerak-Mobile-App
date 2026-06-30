import type { Emirate } from './company.types';

export type CustomerType = 'b2b' | 'b2g' | 'b2c';

// ───────────────────────────────────────────
// Customer — matches CustomerSerializer (GET response)
// ───────────────────────────────────────────
export interface Customer {
  id: string;
  company_name: string;          // read-only, from related Company

  name: string;
  legal_name: string;
  customer_type: CustomerType;
  customer_type_display: string; // read-only, human label

  // Tax
  trn: string;
  tin: string;                   // read-only, auto-derived
  vat_number: string;
  trn_issue_date: string | null;
  trn_expiry_date: string | null;

  // PEPPOL
  peppol_endpoint: string;
  is_peppol_connected: boolean;  // read-only

  // Documents — backend returns file URLs once uploaded
  trn_document: string | null;
  logo: string | null;

  // Address
  street_address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  formatted_address: string;     // read-only

  // Contact
  email: string;
  phone: string;

  // Completeness (for invoice gating)
  is_complete: boolean;          // read-only
  missing_fields: string[];      // read-only
  completion_percent: number;    // read-only

  notes: string;
  is_active: boolean;            // read-only
  created_at: string;            // read-only
  updated_at: string;            // read-only
  
}

// ───────────────────────────────────────────
// Create payload — matches CustomerCreateSerializer
// trn_document and logo are mandatory files → multipart/form-data
// ───────────────────────────────────────────
export interface CreateCustomerPayload {
  company_id: string;            // sent in body per views.py

  name: string;
  legal_name?: string;
  customer_type?: CustomerType;  // defaults to 'b2b' on backend

  trn?: string;                  // required for UAE B2B/B2G (cross-field validated)
  vat_number?: string;
  trn_issue_date?: string;
  trn_expiry_date?: string;

  peppol_endpoint?: string;

  // Files — required by backend
  trn_document: { uri: string; name: string; type: string };
  logo: { uri: string; name: string; type: string };

  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;              // defaults to 'AE'

  email?: string;
  phone?: string;
  notes?: string;
}

// ───────────────────────────────────────────
// Update payload — matches CustomerUpdateSerializer
// All optional, no files (file re-upload not in this serializer)
// ───────────────────────────────────────────
export interface UpdateCustomerPayload {
  name?: string;
  legal_name?: string;
  customer_type?: CustomerType;
  trn?: string;
  vat_number?: string;
  trn_issue_date?: string | null;
  trn_expiry_date?: string | null;
  peppol_endpoint?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

// ───────────────────────────────────────────
// List filter params — matches CustomerFilterSerializer
// ───────────────────────────────────────────
export interface CustomerFilterParams {
  company_id: string;            // required
  search?: string;
  customer_type?: CustomerType;
  country?: string;
}

// ───────────────────────────────────────────
// Paginated list response (StandardResultsPagination)
// ───────────────────────────────────────────
export interface PaginatedCustomers {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
}