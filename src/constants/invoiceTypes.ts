// ───────────────────────────────────────────────────────────────
// Invoice type catalog — the categories shown on "New Invoice".
// Mirrors the web's Document Types + UAE FTA VAT-return categories.
// ───────────────────────────────────────────────────────────────
import type { Feather } from '@expo/vector-icons';
import type { InvoiceType, TransactionType } from '../types/invoice.types';

export type FeatherName = keyof typeof Feather.glyphMap;

export interface InvoiceTypeItem {
  key: string;            // stable id, sent as a param
  title: string;
  code: string;           // 'UBL 380' | 'Box 1a' | 'Req 1.1'
  subtitle: string;       // short one-liner
  description: string;    // full description
  vat: string;            // 'VAT 5%' | 'VAT 0%' | 'Exempt' …
  icon: FeatherName;
  invoiceType?: InvoiceType;         // only for Document Types
  transactionType?: TransactionType; // sensible default where known
}

export interface InvoiceTypeGroup {
  key: string;
  title: string;
  subtitle: string;
  icon: FeatherName;
  tint: string;           // group accent
  items: InvoiceTypeItem[];
}

export const INVOICE_TYPE_GROUPS: InvoiceTypeGroup[] = [
  {
    key: 'documents',
    title: 'Document Types',
    subtitle: 'UAE FTA Req 12 & 13 — Tax invoices, credit & debit notes',
    icon: 'file-text',
    tint: '#2563eb',
    items: [
      {
        key: 'tax_invoice',
        title: 'Tax Invoice',
        code: 'UBL 380',
        subtitle: 'Standard B2B / B2G',
        description: 'Standard UAE tax invoice for goods and services supplied to registered businesses or government entities.',
        vat: 'VAT 5%',
        icon: 'file-text',
        invoiceType: 'tax_invoice',
        transactionType: 'b2b',
      },
      {
        key: 'credit_note',
        title: 'Credit Note',
        code: 'UBL 381',
        subtitle: 'Corrects a prior invoice',
        description: 'Issued to reduce the value of a previously issued tax invoice. Requires the original invoice number.',
        vat: 'VAT Varies',
        icon: 'rotate-ccw',
        invoiceType: 'credit_note',
        transactionType: 'b2b',
      },
      {
        key: 'debit_note',
        title: 'Debit Note',
        code: 'UBL 383',
        subtitle: 'Increases value of a prior invoice',
        description: 'Issued to increase the value of a previously issued tax invoice. Requires the original invoice number.',
        vat: 'VAT Varies',
        icon: 'file-plus',
        invoiceType: 'tax_invoice',
        transactionType: 'b2b',
      },
    ],
  },
  {
    key: 'sales',
    title: 'Sales / Output Supplies',
    subtitle: 'UAE FTA Req 1.1–1.9 — Output tax categories (Boxes 1–6)',
    icon: 'trending-up',
    tint: '#059669',
    items: [
      { key: 'domestic_sales', title: 'Domestic Sales', code: 'Box 1a', subtitle: 'Standard-rated supplies', description: 'Sales of goods or services within the UAE subject to standard 5% VAT.', vat: 'VAT 5%', icon: 'trending-up', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'intra_gcc_transfer', title: 'Intra-GCC Transfer', code: 'Box 1b', subtitle: 'Transfer of imported goods (5%)', description: 'Transfer of imported goods between GCC states subject to UAE standard rate VAT.', vat: 'VAT 5%', icon: 'arrow-up-right', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'import_reverse_charge', title: 'Import — Reverse Charge', code: 'Box 1c', subtitle: 'Import outside GCC (RC)', description: 'Import from outside GCC subject to reverse charge — VAT liability transfers to the buyer.', vat: 'VAT 5% RC', icon: 'download', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'intra_gcc_purchase_out', title: 'Intra-GCC Purchase', code: 'Box 1d', subtitle: 'Standard-rated (5%)', description: 'Standard-rated purchases from other GCC member states subject to UAE VAT.', vat: 'VAT 5%', icon: 'shopping-bag', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'exports', title: 'Exports', code: 'Box 2', subtitle: 'Zero-rated supplies (0%)', description: 'Export of goods or services to customers outside the UAE or GCC — zero-rated for VAT.', vat: 'VAT 0%', icon: 'globe', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'intra_gcc_supplies', title: 'Intra-GCC Supplies', code: 'Box 3', subtitle: 'Outside scope of VAT', description: 'Intra-GCC supplies that fall outside the scope of UAE VAT legislation.', vat: 'VAT OOS', icon: 'minus', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'exempt_supplies', title: 'Exempt Supplies', code: 'Box 4', subtitle: 'No VAT applicable', description: 'Exempt supplies such as financial services, bare land, or residential rent — no VAT charged.', vat: 'Exempt', icon: 'shield', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'out_of_scope', title: 'Out of Scope Supplies', code: 'Box 5', subtitle: 'Outside VAT legislation', description: 'Supplies that fall entirely outside the scope of UAE VAT law.', vat: 'VAT OOS', icon: 'minus-circle', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'deemed_supplies', title: 'Deemed Supplies', code: 'Box 6', subtitle: 'Treated as taxable (5%)', description: 'Supplies treated as taxable under UAE VAT law — e.g. gifts, personal use, business entertainment.', vat: 'VAT 5%', icon: 'gift', invoiceType: 'tax_invoice', transactionType: 'b2b' },
    ],
  },
  {
    key: 'purchases',
    title: 'Purchases / Input Tax',
    subtitle: 'UAE FTA Req 1.10–1.14 — Input tax recovery (Boxes 10–14)',
    icon: 'trending-down',
    tint: '#7c3aed',
    items: [
      { key: 'domestic_purchase', title: 'Domestic Purchase', code: 'Box 10', subtitle: 'Standard-rated (5%)', description: 'Purchase of goods or services within the UAE subject to standard 5% VAT.', vat: 'VAT 5%', icon: 'trending-down', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'import_outside_gcc', title: 'Import from Outside GCC', code: 'Box 11', subtitle: 'Normal, suspension & deferment', description: 'Imports from outside GCC — includes normal imports, under suspension, and under VAT deferment scheme.', vat: 'VAT 5%', icon: 'arrow-down-right', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'intra_gcc_purchases', title: 'Intra-GCC Purchases', code: 'Box 12', subtitle: 'Imports — suspension / deferment', description: 'Intra-GCC purchases including those under suspension or VAT normal deferment scheme.', vat: 'VAT 5%', icon: 'box', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'other_purchases', title: 'Other Purchases', code: 'Box 13', subtitle: 'Zero-rated / Exempt / Non-VAT', description: 'Zero-rated purchases, disallowed expenses, purchases from non-VAT registered suppliers, and exempt supplies.', vat: 'VAT 0% / Exempt', icon: 'shopping-bag', invoiceType: 'tax_invoice', transactionType: 'b2b' },
      { key: 'recoverable_input_tax', title: 'Recoverable Input Tax', code: 'Box 14', subtitle: 'Partial exemption method', description: 'Total recoverable input tax under the partial exemption method — standard-rated purchases only.', vat: 'VAT 5%', icon: 'bar-chart-2', invoiceType: 'tax_invoice', transactionType: 'b2b' },
    ],
  },
];

// Flat lookup by key (used by the create wizard to resolve a passed param).
export const INVOICE_TYPE_INDEX: Record<string, InvoiceTypeItem> = Object.fromEntries(
  INVOICE_TYPE_GROUPS.flatMap((g) => g.items.map((it) => [it.key, it]))
);
