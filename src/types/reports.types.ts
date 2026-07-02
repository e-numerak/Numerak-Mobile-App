// ───────────────────────────────────────────
// Accounts Receivable (AR) report types — /api/v1/reports/ar/
// ───────────────────────────────────────────

export interface ArSummary {
  total_receivable: number | string;
  total_overdue: number | string;
  open_invoice_count: number;
  overdue_invoice_count: number;
  dso_days: number;
}

// 15-day aging buckets
export interface ArAging {
  current: number | string;
  d1_15: number | string;
  d16_30: number | string;
  d31_45: number | string;
  d46_60: number | string;
  d60_plus: number | string;
}

// One row of "outstanding per customer". Backend field names aren't fully
// documented, so the api layer normalizes into this shape defensively.
export interface ArCustomerOutstanding {
  customer_id?: string;
  customer_name: string;
  invoice_count: number;
  overdue: number | string;
  outstanding: number | string;
}
