// Base URL & version — .env se aata hai (Step 5)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.e-numerak.com';
export const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION ?? '/api/v1';
console.log('API BASE URL IS:', API_BASE_URL); // TEMPORARY DEBUG LINE
// Poora base jisse har endpoint banega
export const API_URL = `${API_BASE_URL}${API_VERSION}`;

// ───────────────────────────────────────────
// Health (no auth)
// ───────────────────────────────────────────
export const HEALTH_ENDPOINTS = {
  liveness: `${API_BASE_URL}/health/`,
  readiness: `${API_BASE_URL}/ready/`,
};

// ───────────────────────────────────────────
// Auth — /api/v1/auth/
// ───────────────────────────────────────────
export const AUTH_ENDPOINTS = {
  checkEmail: `${API_URL}/auth/check-email/`,
  register: `${API_URL}/auth/register/`,
  login: `${API_URL}/auth/login/`,
  logout: `${API_URL}/auth/logout/`,
  refreshToken: `${API_URL}/auth/token/refresh/`,
  me: `${API_URL}/auth/me/`,
  changePassword: `${API_URL}/auth/change-password/`,
  verifyEmail: `${API_URL}/auth/verify-email/`,
  resendVerification: `${API_URL}/auth/resend-verification/`,
  forgotPassword: `${API_URL}/auth/forgot-password/`,
  resetPassword: `${API_URL}/auth/reset-password/`,
  mfaSetup: `${API_URL}/auth/mfa/setup/`,
  mfaEnable: `${API_URL}/auth/mfa/enable/`,
  mfaDisable: `${API_URL}/auth/mfa/disable/`,
  mfaStatus: `${API_URL}/auth/mfa/status/`,
  mfaVerifyLogin: `${API_URL}/auth/mfa/verify-login/`,
  mfaSetupLogin: `${API_URL}/auth/mfa/setup-login/`,
  mfaEnableLogin: `${API_URL}/auth/mfa/enable-login/`,
};

// ───────────────────────────────────────────
// Companies — /api/v1/companies/
// ───────────────────────────────────────────
export const COMPANY_ENDPOINTS = {
  list: `${API_URL}/companies/`,
  detail: (companyId: string) => `${API_URL}/companies/${companyId}/`,
  members: (companyId: string) => `${API_URL}/companies/${companyId}/members/`,
  memberDetail: (companyId: string, memberId: string) =>
    `${API_URL}/companies/${companyId}/members/${memberId}/`,
};

export const CUSTOMERS_URL = `${API_URL}/customers/`;
export const TAXES_URL = `${API_URL}/taxes/`;
export const ONBOARDING_URL = `${API_URL}/onboarding/`;


// ───────────────────────────────────────────
// Taxes — /api/v1/Tax/
// ───────────────────────────────────────────
export const TAX_ENDPOINTS = {
  rates: `${API_URL}/taxes/rates/`,
  calculate: `${API_URL}/taxes/calculate/`,
};

// ───────────────────────────────────────────
// Customers — /api/v1/customers/
// ───────────────────────────────────────────
export const CUSTOMER_ENDPOINTS = {
  list: `${API_URL}/customers/`,
  detail: (customerId: string) => `${API_URL}/customers/${customerId}/`,
};

// ───────────────────────────────────────────
// Invoices — /api/v1/invoices/
// ───────────────────────────────────────────
export const INVOICE_ENDPOINTS = {
  list: `${API_URL}/invoices/`,
  detail: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/`,
  validate: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/validate/`,
  submit: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/submit/`,
  cancel: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/cancel/`,
  deactivate: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/deactivate/`,
  creditNote: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/credit-note/`,
  downloadXml: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/download-xml/`,
  downloadPdf: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/download-pdf/`,
  vatSummary: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/vat-summary/`,
  items: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/items/`,
  itemDetail: (invoiceId: string, itemId: string) =>
    `${API_URL}/invoices/${invoiceId}/items/${itemId}/`,
  reportFta: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/report-fta/`,
  payments: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/payments/`,
  dashboard: `${API_URL}/invoices/dashboard/`,
  export: `${API_URL}/invoices/export/`,
  gapReport: `${API_URL}/invoices/gap-report/`,
  products: `${API_URL}/invoices/products/`,
  productDetail: (productId: string) => `${API_URL}/invoices/products/${productId}/`,
  draftAutosave: `${API_URL}/invoices/draft-autosave/`,
  // Workflow + per-invoice fraud
  workflowEvaluate: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/workflow/evaluate/`,
  fraud: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/fraud/`,
  fraudAnalyze: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/fraud/analyze/`,
  fraudResolve: (invoiceId: string) => `${API_URL}/invoices/${invoiceId}/fraud/resolve/`,
};

// ───────────────────────────────────────────
// Inbound (PEPPOL receiving) — /api/v1/inbound/
// ───────────────────────────────────────────
export const INBOUND_ENDPOINTS = {
  as4Receive: `${API_URL}/inbound/as4/`, // no-auth (m2m) — app se directly use nahi hoga
  submit: `${API_URL}/inbound/submit/`,
  list: `${API_URL}/inbound/`,
  stats: `${API_URL}/inbound/stats/`,
  detail: (pk: string) => `${API_URL}/inbound/${pk}/`,
  approve: (pk: string) => `${API_URL}/inbound/${pk}/approve/`,
  reject: (pk: string) => `${API_URL}/inbound/${pk}/reject/`,
  resendObservation: (pk: string) => `${API_URL}/inbound/${pk}/resend-observation/`,
  suppliers: `${API_URL}/inbound/suppliers/`,
  suppliersActivate: `${API_URL}/inbound/suppliers/activate/`,
  portal: `${API_URL}/inbound/portal/`,
  portalSubmit: `${API_URL}/inbound/portal/submit/`,
};

// ───────────────────────────────────────────
// Other modules
// ───────────────────────────────────────────
export const REPORTS_URL = `${API_URL}/reports/`;
export const OCR_URL = `${API_URL}/ocr/`;
export const FRAUD_URL = `${API_URL}/fraud/`;
export const CHAT_URL = `${API_URL}/chat/`;
export const BUYERS_URL = `${API_URL}/buyers/`;
export const BUYER_URL = `${API_URL}/buyer/`;
export const ADMIN_URL = `${API_URL}/admin/`;