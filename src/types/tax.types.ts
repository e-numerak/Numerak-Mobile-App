export type VatRateType = 'standard' | 'zero' | 'exempt' | 'out_of_scope';

// ───────────────────────────────────────────
// GET /taxes/rates/ response item
// ───────────────────────────────────────────
export interface VatRate {
  code: VatRateType;
  label: string;
  rate: string | null;        // e.g. "5.00", or null for exempt/out_of_scope
  description: string;
  input_tax_recovery: boolean;
}

// ───────────────────────────────────────────
// POST /taxes/calculate/ payload + response
// ───────────────────────────────────────────
export interface VatCalculatePayload {
  amount: string;              // net unit price, sent as string for precision
  vat_rate_type: VatRateType;
  quantity?: string;            // optional, defaults to "1.0000" on backend
}

export interface VatCalculateResult {
  subtotal: string;
  vat_rate: string;
  vat_amount: string;
  total_amount: string;
  currency: string;             // e.g. "AED"
}