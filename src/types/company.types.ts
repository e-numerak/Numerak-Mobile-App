// ───────────────────────────────────────────
// Shared enums (from apps/common/constants.py)
// ───────────────────────────────────────────

export type Emirate =
  | 'abu_dhabi'
  | 'dubai'
  | 'sharjah'
  | 'ajman'
  | 'umm_al_quwain'
  | 'ras_al_khaimah'
  | 'fujairah';

export type LegalRegistrationType = 'TL' | 'CRN' | 'EID' | 'PAS' | 'CD' | '';

// USER_ROLE_CHOICES — exact match from apps/common/constants.py
export type UserRole =
  | 'admin'
  | 'supplier'
  | 'accountant'
  | 'viewer'
  | 'inbound_supplier'
  | 'buyer';

// ───────────────────────────────────────────
// Company
// Matches CompanySerializer (GET response shape)
// ───────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  legal_name: string;
  trn: string;                  // 15-digit UAE TRN
  tin: string;                  // auto-derived, first 10 digits — read-only

  trn_issue_date: string | null;
  trn_expiry_date: string | null;

  is_vat_group: boolean;

  street_address: string;
  city: string;
  emirate: Emirate;
  po_box: string;
  country: string;              // ISO 3166-1 alpha-2, e.g. "AE"
  formatted_address: string;    // computed, read-only

  phone: string;
  email: string;
  website: string;

  legal_registration_id: string;
  legal_registration_type: LegalRegistrationType;

  peppol_endpoint: string;      // e.g. "0088:1234567890123"

  logo_url: string | null;      // computed, read-only

  is_active: boolean;           // read-only
  member_count: number;         // computed, read-only

  created_at: string;           // read-only
  updated_at: string;           // read-only
}

// ───────────────────────────────────────────
// Create / Update payloads
// Matches CompanyCreateSerializer / CompanyUpdateSerializer (request body)
// ───────────────────────────────────────────

export interface CreateCompanyPayload {
  name: string;
  legal_name?: string;
  trn: string;                  // required, exactly 15 digits
  is_vat_group?: boolean;

  street_address: string;
  city: string;
  emirate?: Emirate;             // defaults to 'dubai' on backend
  po_box?: string;
  country?: string;              // defaults to 'AE' on backend

  phone?: string;
  email?: string;
  website?: string;

  legal_registration_id?: string;
  legal_registration_type?: LegalRegistrationType;
}

// Update excludes trn (immutable) — everything else optional.
// Also allows fields create doesn't: peppol_endpoint, trn dates, logo.
export interface UpdateCompanyPayload {
  name?: string;
  legal_name?: string;
  is_vat_group?: boolean;
  street_address?: string;
  city?: string;
  emirate?: Emirate;
  po_box?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  legal_registration_id?: string;
  legal_registration_type?: LegalRegistrationType;
  peppol_endpoint?: string;
  trn_issue_date?: string | null;
  trn_expiry_date?: string | null;
  // logo upload handled separately (multipart) — not included here
}

// ───────────────────────────────────────────
// Company Member
// Matches CompanyMemberSerializer (GET response shape)
// ───────────────────────────────────────────

export interface CompanyMember {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ───────────────────────────────────────────
// Add / Update member payloads
// Matches AddMemberSerializer / ChangeMemberRoleSerializer
// ───────────────────────────────────────────

export interface AddMemberPayload {
  user_email: string;            // must belong to an existing active user
  role?: UserRole;                // defaults to 'viewer' on backend
}

export interface UpdateMemberPayload {
  role: UserRole;                 // ChangeMemberRoleSerializer only accepts role
}