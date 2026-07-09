import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { useCustomers } from '../../../src/hooks/useCustomers';
import { useCreateInvoice, useProducts } from '../../../src/hooks/useInvoices';
import { INVOICE_TYPE_INDEX } from '../../../src/constants/invoiceTypes';
import {
  fetchDraftAutosave,
  saveDraftAutosave,
  deleteDraftAutosave,
} from '../../../src/api/invoices.api';
import type {
  TransactionType,
  Currency,
  VatRateType,
  PaymentMeansCode,
  CreateInvoicePayload,
  InlineInvoiceItemPayload,
  InvoiceFormType,
} from '../../../src/types/invoice.types';

const FORM_TYPE: InvoiceFormType = 'new';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';
const GREEN = '#16a34a';

const PickerCtx = createContext<(open: boolean) => void>(() => {});

type Opt<T extends string> = { value: T; label: string };

const TAX_CODE_OPTIONS: Opt<string>[] = [
  { value: 'S', label: 'S — Standard 5%' },
  { value: 'Z', label: 'Z — Zero Rate 0%' },
  { value: 'E', label: 'E — Exempt' },
  { value: 'O', label: 'O — Out of Scope' },
];

const UNIT_OPTIONS: Opt<string>[] = [
  { value: 'pcs', label: 'pcs' },
  { value: 'hr', label: 'hr' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'm', label: 'm' },
  { value: 'm²', label: 'm²' },
  { value: 'm³', label: 'm³' },
  { value: 'L', label: 'L' },
  { value: 'ml', label: 'ml' },
  { value: 'box', label: 'box' },
  { value: 'set', label: 'set' },
  { value: 'pair', label: 'pair' },
  { value: 'doz', label: 'doz' },
  { value: 'day', label: 'day' },
  { value: 'month', label: 'month' },
  { value: 'year', label: 'year' },
  { value: 'unit', label: 'unit' },
];

const AR_AP_OPTIONS: Opt<string>[] = [
  { value: 'AR', label: 'Accounts Receivable (AR)' },
  { value: 'AP', label: 'Accounts Payable (AP)' },
];
const TRANSACTION_TYPES: Opt<TransactionType>[] = [
  { value: 'b2b', label: 'B2B — Business to Business' },
  { value: 'b2g', label: 'B2G — Business to Government' },
  { value: 'b2c', label: 'B2C — Business to Consumer' },
];
const CURRENCIES: Opt<Currency>[] = [
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
];
const PAYMENT_MEANS: Opt<PaymentMeansCode>[] = [
  { value: '30', label: '30 — Credit Transfer' },
  { value: '10', label: '10 — Cash' },
  { value: '20', label: '20 — Cheque' },
  { value: '48', label: '48 — Bank Card' },
  { value: '49', label: '49 — Direct Debit' },
  { value: '57', label: '57 — Standing Order' },
  { value: '58', label: '58 — SEPA Credit Transfer' },
];
const VAT_RATE_TYPES: Opt<VatRateType>[] = [
  { value: 'standard', label: 'Standard 5%' },
  { value: 'zero', label: 'Zero 0%' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'out_of_scope', label: 'Out of Scope' },
];
const VAT_RATE_MAP: Record<VatRateType, number> = { standard: 5, zero: 0, exempt: 0, out_of_scope: 0 };

const LIMIT = {
  location: 200, itemName: 120, description: 500, unit: 20,
  qty: 12, price: 14, permit: 50, txnId: 50, po: 50, gl: 50, discount: 14, notes: 1000,
  taxCode: 5, debit: 14, credit: 14, originalInvoice: 50,
};
const REF_RE = /^[A-Za-z0-9\-_/.#&() ]*$/;

const STEPS = [
  { key: 'info', label: 'Your Info', sub: 'Your company (seller) details', icon: 'briefcase' },
  { key: 'buyer', label: 'Buyer', sub: 'Select the customer being invoiced', icon: 'user' },
  { key: 'items', label: 'Product Catalog', sub: 'Products & services', icon: 'package' },
  { key: 'details', label: 'Payment and Details', sub: 'Dates, references & currency', icon: 'file-text' },
  { key: 'qr', label: 'Print Code', sub: 'Scan-to-verify QR code', icon: 'grid' },
  { key: 'review', label: 'Review', sub: 'Confirm & create', icon: 'check-circle' },
] as const;

interface FormItem {
  item_name: string;
  product_reference: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  vat_rate_type: VatRateType;
  tax_code: string;
  debit_amount: string;
  credit_amount: string;
}
const emptyItem = (): FormItem => ({
  item_name: '', product_reference: '', description: '', quantity: '1', unit: '',
  unit_price: '', vat_rate_type: 'standard',
  tax_code: '', debit_amount: '', credit_amount: '',
});

const today = () => new Date().toISOString().slice(0, 10);
function money(n: number): string {
  return n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function invoiceNumberPreview(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `INV-${dd}${mm}${d.getFullYear()}-001`;
}

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string; typeKey?: string }>();
  const insets = useSafeAreaInsets();
  const selectedType = params.typeKey ? INVOICE_TYPE_INDEX[params.typeKey] : undefined;

  const isCreditOrDebitNote =
    selectedType?.key === 'credit_note' || selectedType?.key === 'debit_note';

  const { data: companies } = useCompanies();
  const { mutateAsync: createInvoice, isPending } = useCreateInvoice();

  const [step, setStep] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string>(params.companyId ?? '');

  // Step 1 — Your Info
  const [supplierLocation, setSupplierLocation] = useState('');
  const [arType, setArType] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('b2b');
  const [paymentMeansCode, setPaymentMeansCode] = useState<PaymentMeansCode>('30');

  // Step 2 — Buyer
  const [customerId, setCustomerId] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');

  // Step 3 — Line items
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  // Step 4 — Details
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [supplyDate, setSupplyDate] = useState('');
  const [taxPaymentDate, setTaxPaymentDate] = useState('');
  const [permitNumber, setPermitNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [glAccountId, setGlAccountId] = useState('');
  const [currency, setCurrency] = useState<Currency>('AED');
  const [discountAmount, setDiscountAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState('');

  const invoiceNo = useMemo(invoiceNumberPreview, []);

  useEffect(() => {
    if (!companyId && companies && companies.length > 0) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  useEffect(() => {
    if (selectedType?.transactionType) setTransactionType(selectedType.transactionType);
  }, [params.typeKey]);

  const { data: customerData } = useCustomers({ company_id: companyId });
  const customers = customerData?.results ?? [];
  const customerOptions: Opt<string>[] = customers.map((c) => ({ value: c.id, label: c.name }));

  const selectedCompany = companies?.find((c) => c.id === companyId);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const { data: products } = useProducts(companyId);
  const productList = Array.isArray(products) ? products : [];
  const productOptions: Opt<string>[] = productList.map((p) => ({
    value: p.id,
    label: `${p.name}${p.unit_price ? ` — ${p.unit_price}` : ''}`,
  }));
  function applyProduct(idx: number, productId: string) {
    const p = productList.find((x) => x.id === productId);
    if (!p) return;
    updateItem(idx, {
      item_name: p.name ?? '',
      product_reference: (p as any).product_reference ?? '',
      description: p.description || p.name || '',
      unit_price: String(p.unit_price ?? ''),
      unit: p.unit ?? '',
      vat_rate_type: (p.vat_rate_type as VatRateType) ?? 'standard',
      tax_code: (p as any).tax_code ?? '',
    });
  }

  useEffect(() => {
    if (selectedCompany && !supplierLocation) {
      setSupplierLocation(selectedCompany.formatted_address ?? '');
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCustomer) setCustomerLocation((selectedCustomer as any).formatted_address ?? '');
  }, [customerId]);

  const discount = parseFloat(discountAmount) || 0;
  const lineCalcs = items.map((it) => {
    const net = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
    return { net, vat: (net * (VAT_RATE_MAP[it.vat_rate_type] ?? 0)) / 100 };
  });
  const subtotal = lineCalcs.reduce((s, l) => s + l.net, 0);
  const taxable = Math.max(0, subtotal - discount);
  const totalVat = lineCalcs.reduce((s, l) => s + l.vat, 0);
  const grandTotal = taxable + totalVat;

  // ── Step 4 live validation ─────────────────────────────────────────────────
  const detailErrors = useMemo(() => {
    const e: Record<string, string> = {};
    const checkRef = (val: string, key: string, label: string, required?: boolean) => {
      const v = val.trim();
      if (!v) {
        if (required) e[key] = `${label} is required.`;
        return;
      }
      if (!REF_RE.test(v)) e[key] = 'Only letters, numbers and - _ / . # & ( ) are allowed.';
    };
    // ── All three are now required ──
    checkRef(permitNumber,       'permit', 'Permit Number',          true);
    checkRef(transactionId,      'txnId',  'Transaction ID',         true);
    checkRef(purchaseOrderNumber,'po',     'Purchase Order Number',  true);
    checkRef(glAccountId,        'gl',     'GL / Account ID',        true);
    checkRef(originalInvoiceNumber, 'originalInvoice', 'Original Invoice Number', isCreditOrDebitNote);

    if (discountAmount.trim()) {
      const d = Number(discountAmount);
      if (Number.isNaN(d)) e.discount = 'Enter a valid amount.';
      else if (d < 0) e.discount = 'Discount cannot be negative.';
      else if (subtotal > 0 && d > subtotal) e.discount = 'Discount cannot exceed the subtotal.';
    }
    return e;
  }, [permitNumber, transactionId, purchaseOrderNumber, glAccountId, discountAmount, subtotal, originalInvoiceNumber, isCreditOrDebitNote]);

  function updateItem(idx: number, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  // ── Draft autosave ─────────────────────────────────────────────────────────
  const [draftChecked, setDraftChecked] = useState(false);
  const [restorePayload, setRestorePayload] = useState<Record<string, unknown> | null>(null);
  const [autoStatus, setAutoStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const buildSnapshot = () => ({
    supplierLocation, arType, transactionType, paymentMeansCode, customerId, customerLocation,
    items, issueDate, dueDate, supplyDate, taxPaymentDate, permitNumber, transactionId,
    purchaseOrderNumber, glAccountId, currency, discountAmount, notes, originalInvoiceNumber,
  });

  function hydrate(p: any) {
    if (!p) return;
    if (p.supplierLocation != null) setSupplierLocation(p.supplierLocation);
    if (p.arType != null) setArType(p.arType);
    if (p.transactionType) setTransactionType(p.transactionType);
    if (p.paymentMeansCode) setPaymentMeansCode(p.paymentMeansCode);
    if (p.customerId != null) setCustomerId(p.customerId);
    if (p.customerLocation != null) setCustomerLocation(p.customerLocation);
    if (Array.isArray(p.items) && p.items.length) setItems(p.items);
    if (p.issueDate != null) setIssueDate(p.issueDate);
    if (p.dueDate != null) setDueDate(p.dueDate);
    if (p.supplyDate != null) setSupplyDate(p.supplyDate);
    if (p.taxPaymentDate != null) setTaxPaymentDate(p.taxPaymentDate);
    if (p.permitNumber != null) setPermitNumber(p.permitNumber);
    if (p.transactionId != null) setTransactionId(p.transactionId);
    if (p.purchaseOrderNumber != null) setPurchaseOrderNumber(p.purchaseOrderNumber);
    if (p.glAccountId != null) setGlAccountId(p.glAccountId);
    if (p.currency) setCurrency(p.currency);
    if (p.discountAmount != null) setDiscountAmount(p.discountAmount);
    if (p.notes != null) setNotes(p.notes);
    if (p.originalInvoiceNumber != null) setOriginalInvoiceNumber(p.originalInvoiceNumber);
  }

  useEffect(() => {
    if (!companyId || draftChecked) return;
    let cancelled = false;
    fetchDraftAutosave(companyId, FORM_TYPE)
      .then((d) => {
        if (cancelled) return;
        if (d?.exists && d.payload && Object.keys(d.payload).length > 0) {
          setRestorePayload(d.payload as Record<string, unknown>);
        }
        setDraftChecked(true);
      })
      .catch(() => { if (!cancelled) setDraftChecked(true); });
    return () => { cancelled = true; };
  }, [companyId, draftChecked]);

  const hasContent =
    !!customerId || notes.trim().length > 0 ||
    items.some((it) => it.description.trim() || it.unit_price.trim() || it.item_name.trim());

  useEffect(() => {
    if (!companyId || !draftChecked || restorePayload || !hasContent) return;
    setAutoStatus('saving');
    const t = setTimeout(() => {
      saveDraftAutosave({ company_id: companyId, form_type: FORM_TYPE, payload: buildSnapshot() })
        .then(() => setAutoStatus('saved'))
        .catch(() => setAutoStatus('idle'));
    }, 1500);
    return () => clearTimeout(t);
  }, [
    companyId, draftChecked, restorePayload, hasContent,
    supplierLocation, arType, transactionType, paymentMeansCode, customerId, customerLocation,
    items, issueDate, dueDate, supplyDate, taxPaymentDate, permitNumber, transactionId,
    purchaseOrderNumber, glAccountId, currency, discountAmount, notes, originalInvoiceNumber,
  ]);

  // ── Step validation ────────────────────────────────────────────────────────
  function validateStep(s: number): boolean {
    if (s === 0) {
      if (!companyId) { Alert.alert('Company required', 'Please select a company.'); return false; }
      if (!supplierLocation.trim()) { Alert.alert('Required', 'Supplier Location is required.'); return false; }
      if (!arType) { Alert.alert('Required', 'Accounts Receivable / Payable is required (for the audit file).'); return false; }
    }
    if (s === 1) {
      if (!customerId) { Alert.alert('Required', 'Please select a customer (buyer).'); return false; }
      if (!customerLocation.trim()) { Alert.alert('Required', 'Customer Location is required.'); return false; }
    }
    if (s === 2) {
      const errors: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.item_name.trim()) errors.push(`Item ${i + 1}: Name required`);
        if (!it.product_reference.trim()) errors.push(`Item ${i + 1}: Reference required`);
        if (!it.description.trim()) errors.push(`Item ${i + 1}: Description required`);
        if (!it.unit.trim()) errors.push(`Item ${i + 1}: Unit required`);
        if (!(parseFloat(it.quantity) > 0)) errors.push(`Item ${i + 1}: Valid quantity required`);
        if (!(parseFloat(it.unit_price) >= 0)) errors.push(`Item ${i + 1}: Valid price required`);
        if (!it.debit_amount.trim()) errors.push(`Item ${i + 1}: Debit Amount required`);
        if (!it.credit_amount.trim()) errors.push(`Item ${i + 1}: Credit Amount required`);
      }
      if (errors.length > 0) {
        Alert.alert('Please fix these fields', errors.join('\n'));
        return false;
      }
    }
    if (s === 3) {
      if (!issueDate.trim()) {
        Alert.alert('Required', 'Issue Date is required.'); return false;
      }
      if (dueDate.trim() && dueDate < issueDate) {
        Alert.alert('Check dates', 'Due Date cannot be earlier than the Issue Date.'); return false;
      }
      // ── NEW: Permit Number, Transaction ID, Purchase Order Number all required ──
      if (!permitNumber.trim()) {
        Alert.alert('Required', 'Permit Number is required for audit compliance.'); return false;
      }
      if (!REF_RE.test(permitNumber.trim())) {
        Alert.alert('Invalid Permit Number', 'Only letters, numbers and - _ / . # & ( ) are allowed.'); return false;
      }
      if (!transactionId.trim()) {
        Alert.alert('Required', 'Transaction ID is required for audit compliance.'); return false;
      }
      if (!REF_RE.test(transactionId.trim())) {
        Alert.alert('Invalid Transaction ID', 'Only letters, numbers and - _ / . # & ( ) are allowed.'); return false;
      }
      if (!purchaseOrderNumber.trim()) {
        Alert.alert('Required', 'Purchase Order Number is required for audit compliance.'); return false;
      }
      if (!REF_RE.test(purchaseOrderNumber.trim())) {
        Alert.alert('Invalid Purchase Order Number', 'Only letters, numbers and - _ / . # & ( ) are allowed.'); return false;
      }
      if (isCreditOrDebitNote && !originalInvoiceNumber.trim()) {
        Alert.alert('Required', 'Original Invoice Number is required for Credit/Debit Notes.'); return false;
      }
      const keys = Object.keys(detailErrors);
      if (keys.length > 0) {
        Alert.alert('Check the highlighted fields', detailErrors[keys[0]]); return false;
      }
    }
    return true;
  }

  const goNext = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => { if (step === 0) router.back(); else setStep((s) => s - 1); };

  function resetForm() {
    setStep(0);
    setArType('');
    setTransactionType('b2b');
    setPaymentMeansCode('30');
    setCustomerId('');
    setCustomerLocation('');
    setItems([emptyItem()]);
    setIssueDate(today());
    setDueDate('');
    setSupplyDate('');
    setTaxPaymentDate('');
    setPermitNumber('');
    setTransactionId('');
    setPurchaseOrderNumber('');
    setGlAccountId('');
    setCurrency('AED');
    setDiscountAmount('');
    setNotes('');
    setOriginalInvoiceNumber('');
    setAutoStatus('idle');
    setSupplierLocation(selectedCompany?.formatted_address ?? '');
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (isPending) return;
    for (let s = 0; s <= 3; s++) if (!validateStep(s)) { setStep(s); return; }

    const validItems: InlineInvoiceItemPayload[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!(it.description.trim() || it.unit_price.trim() || it.item_name.trim())) continue;
      if (!it.description.trim()) { setStep(2); Alert.alert('Item error', `Item #${i + 1}: description is required.`); return; }
      const qty = parseFloat(it.quantity);
      if (!(qty > 0)) { setStep(2); Alert.alert('Item error', `Item #${i + 1}: quantity must be greater than 0.`); return; }
      const price = parseFloat(it.unit_price);
      if (!(price >= 0)) { setStep(2); Alert.alert('Item error', `Item #${i + 1}: unit price cannot be negative.`); return; }
      validItems.push({
        item_name: it.item_name.trim() || undefined,
        product_reference: it.product_reference.trim(),
        description: it.description.trim(),
        quantity: qty,
        unit: it.unit.trim() || undefined,
        unit_price: price,
        vat_rate_type: it.vat_rate_type,
        tax_code: it.tax_code.trim(),
        debit_amount: parseFloat(it.debit_amount) || 0,
        credit_amount: parseFloat(it.credit_amount) || 0,
        sort_order: i,
      });
    }
    if (validItems.length === 0) { setStep(2); Alert.alert('Items required', 'Add at least one line item.'); return; }

    const payload: CreateInvoicePayload = {
      company_id: companyId,
      customer_id: customerId,
      invoice_type: selectedType?.invoiceType ?? 'tax_invoice',
      transaction_type: transactionType,
      currency,
      payment_means_code: paymentMeansCode,
      items: validItems,
    };
    if (issueDate.trim()) payload.issue_date = issueDate.trim();
    if (dueDate.trim()) payload.due_date = dueDate.trim();
    if (supplyDate.trim()) payload.supply_date = supplyDate.trim();
    if (discount > 0) payload.discount_amount = discount;
    if (purchaseOrderNumber.trim()) payload.purchase_order_number = purchaseOrderNumber.trim();
    if (notes.trim()) payload.notes = notes.trim();
    if (isCreditOrDebitNote && originalInvoiceNumber.trim()) {
      payload.reference_number = originalInvoiceNumber.trim();
    }

    try {
      const created = await createInvoice(payload);
      deleteDraftAutosave(companyId, FORM_TYPE).catch(() => {});
      resetForm();
      if (created?.id) router.replace(`/invoices/${created.id}` as any);
      else router.replace('/invoices' as any);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.detail ??
        'Failed to create invoice. Please check the fields and try again.';
      Alert.alert('Create failed', String(msg));
    }
  }

  const isLast = step === STEPS.length - 1;
  const qrData = JSON.stringify({
    invoice: invoiceNo,
    seller_trn: selectedCompany?.trn ?? '',
    buyer_trn: selectedCustomer?.trn ?? '',
    total: grandTotal.toFixed(2),
    currency,
    date: issueDate,
  });

  return (
    <PickerCtx.Provider value={setPickerOpen}>
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Create Invoice' }} />

        {/* Header stepper */}
        <View style={styles.stepperCard}>
          <View style={styles.stepsWrap}>
            <View style={styles.stepsLineBg} />
            <View style={[styles.stepsLineFill, { width: `${(step / (STEPS.length - 1)) * 100}%` }]} />
            <View style={styles.stepsRow}>
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <View key={s.key} style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                    {done ? (
                      <Feather name="check" size={12} color="#fff" />
                    ) : (
                      <Text style={[styles.dotNum, active && styles.dotNumActive]}>{i + 1}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.stepHeadRow}>
            <View style={styles.stepHeadIcon}>
              <Feather name={STEPS[step].icon as any} size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepHeadTitle}>{STEPS[step].label}</Text>
              <Text style={styles.stepHeadSub}>Step {step + 1} of {STEPS.length} · {STEPS[step].sub}</Text>
            </View>
          </View>
        </View>

        <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={40}>
          {restorePayload && step === 0 && (
            <View style={styles.restoreBanner}>
              <Feather name="rotate-ccw" size={18} color="#1d4ed8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.restoreTitle}>Resume your unsaved invoice?</Text>
                <Text style={styles.restoreSub}>A draft you started earlier was found.</Text>
              </View>
              <View style={styles.restoreActions}>
                <TouchableOpacity onPress={() => { hydrate(restorePayload); setRestorePayload(null); }}>
                  <Text style={styles.restoreRestore}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setRestorePayload(null); if (companyId) deleteDraftAutosave(companyId, FORM_TYPE).catch(() => {}); }}>
                  <Text style={styles.restoreDiscard}>Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {autoStatus !== 'idle' && !restorePayload && (
            <View style={styles.autoStatusRow}>
              <Feather name={autoStatus === 'saving' ? 'upload-cloud' : 'check-circle'} size={13} color={autoStatus === 'saving' ? SLATE : GREEN} />
              <Text style={styles.autoStatusText}>{autoStatus === 'saving' ? 'Saving draft…' : 'Draft autosaved'}</Text>
            </View>
          )}

          {selectedType && (
            <View style={styles.typeBanner}>
              <View style={styles.typeBannerIcon}>
                <Feather name={selectedType.icon} size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.typeBannerTitle}>{selectedType.title}</Text>
                <Text style={styles.typeBannerSub}>{selectedType.subtitle}</Text>
              </View>
              <View style={styles.typeBannerTags}>
                <View style={styles.typeChip}><Text style={styles.typeChipText}>{selectedType.code}</Text></View>
                <View style={styles.typeChip}><Text style={styles.typeChipText}>{selectedType.vat}</Text></View>
              </View>
            </View>
          )}

          {/* ══ Step 0 — Your Info ══ */}
          {step === 0 && (
            <View style={styles.card}>
              {selectedCompany && (
                <View style={styles.companyCard}>
                  <View style={styles.companyLogo}>
                    <Text style={styles.companyLogoText}>{(selectedCompany.name || '?').slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.companyName}>{selectedCompany.name}</Text>
                    <Text style={styles.companySub}>TRN: {selectedCompany.trn}</Text>
                  </View>
                </View>
              )}
              {companies && companies.length > 1 && (
                <>
                  <Text style={styles.label}>Company</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 8 }}>
                    {companies.map((c) => {
                      const active = c.id === companyId;
                      return (
                        <TouchableOpacity key={c.id} style={[styles.chip, active && styles.chipActive]}
                          onPress={() => { setCompanyId(c.id); setCustomerId(''); setSupplierLocation(c.formatted_address ?? ''); }}>
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}
              <TextField label="Supplier Location" required value={supplierLocation}
                onChange={setSupplierLocation} placeholder="e.g. Office 7, Dubai, UAE" maxLength={LIMIT.location} />
              <SelectField label="Accounts Receivable / Payable" required value={arType}
                options={AR_AP_OPTIONS} placeholder="— Select —" onChange={setArType}
                hint="Required for audit file" />
              <SelectField label="Transaction Type" value={transactionType}
                options={TRANSACTION_TYPES} onChange={(v) => setTransactionType(v as TransactionType)} />
              <SelectField label="Payment Method" value={paymentMeansCode}
                options={PAYMENT_MEANS} onChange={(v) => setPaymentMeansCode(v as PaymentMeansCode)} />
            </View>
          )}

          {/* ══ Step 1 — Buyer ══ */}
          {step === 1 && (
            <View style={styles.card}>
              <SelectField label="Customer (Buyer)" required value={customerId} options={customerOptions}
                placeholder={customers.length ? 'Select a customer…' : 'No customers — add one first'}
                onChange={setCustomerId} />
              <TextField label="Customer Location" required value={customerLocation}
                onChange={setCustomerLocation} placeholder="e.g. Riyadh, Saudi Arabia" maxLength={LIMIT.location} />
            </View>
          )}

          {/* ══ Step 2 — Line Items ══ */}
          {step === 2 && (
            <>
              <View style={styles.card}>
                {items.map((item, idx) => (
                  <View key={idx} style={styles.itemBox}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemHeaderText}>ITEM #{idx + 1}</Text>
                      {items.length > 1 && (
                        <TouchableOpacity onPress={() => removeItem(idx)}>
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {productOptions.length > 0 && (
                      <SelectField
                        label="Pick from catalog (optional)"
                        value=""
                        options={productOptions}
                        placeholder="Select a saved product to auto-fill…"
                        onChange={(pid) => applyProduct(idx, pid)}
                      />
                    )}
                    <TextField
                      label="Item / Service Name" required value={item.item_name}
                      onChange={(v) => updateItem(idx, { item_name: v })}
                      placeholder="e.g. IT Consulting" maxLength={50}
                      error={step === 2 && !item.item_name.trim() ? 'Item name is required.' : undefined}
                    />
                    <TextField
                      label="Product / Service Reference" required value={item.product_reference}
                      onChange={(v) => updateItem(idx, { product_reference: v })}
                      placeholder="e.g. SKU-001 or SVC-REF" maxLength={50}
                      error={step === 2 && !item.product_reference.trim() ? 'Required' : undefined}
                    />
                    <TextField
                      label="Description of Goods / Services" required value={item.description}
                      onChange={(v) => updateItem(idx, { description: v })}
                      placeholder="Full description…" maxLength={LIMIT.description}
                      error={step === 2 && !item.description.trim() ? 'Description is required.' : undefined}
                    />
                    <View style={styles.row2}>
                      <View style={styles.col}>
                        <TextField label="Quantity" required value={item.quantity}
                          onChange={(v) => updateItem(idx, { quantity: v.replace(/[^0-9.]/g, '') })}
                          keyboardType="decimal-pad" placeholder="1" maxLength={LIMIT.qty}
                          error={item.quantity.trim() && !(parseFloat(item.quantity) > 0) ? 'Must be greater than 0.' : undefined} />
                      </View>
                      <View style={styles.col}>
                        <SelectField label="Unit" required value={item.unit}
                          options={UNIT_OPTIONS} placeholder="— Select —"
                          onChange={(v) => updateItem(idx, { unit: v })} />
                      </View>
                    </View>
                    <View style={styles.row2}>
                      <View style={styles.col}>
                        <TextField label="Unit Price (excl. VAT)" required value={item.unit_price}
                          onChange={(v) => updateItem(idx, { unit_price: v.replace(/[^0-9.]/g, '') })}
                          keyboardType="decimal-pad" placeholder="0.00" maxLength={LIMIT.price}
                          error={item.unit_price.trim() && !(parseFloat(item.unit_price) >= 0) ? 'Enter a valid price.' : undefined} />
                      </View>
                      <View style={styles.col}>
                        <SelectField label="VAT Rate" value={item.vat_rate_type}
                          options={VAT_RATE_TYPES} onChange={(v) => updateItem(idx, { vat_rate_type: v as VatRateType })} />
                      </View>
                    </View>
                    <View style={styles.row2}>
                      <View style={styles.col}>
                        <SelectField label="Tax Code" value={item.tax_code}
                          options={TAX_CODE_OPTIONS} placeholder="— Select —"
                          onChange={(v) => updateItem(idx, { tax_code: v })} />
                      </View>
                    </View>
                    <View style={styles.row2}>
                      <View style={styles.col}>
                        <TextField label="Debit Amount (AED)" required value={item.debit_amount}
                          onChange={(v) => updateItem(idx, { debit_amount: v.replace(/[^0-9.]/g, '') })}
                          keyboardType="decimal-pad" placeholder="0.00" maxLength={LIMIT.debit}
                          error={item.debit_amount.trim() && !(parseFloat(item.debit_amount) >= 0) ? 'Enter a valid amount.' : undefined} />
                      </View>
                      <View style={styles.col}>
                        <TextField label="Credit Amount (AED)" required value={item.credit_amount}
                          onChange={(v) => updateItem(idx, { credit_amount: v.replace(/[^0-9.]/g, '') })}
                          keyboardType="decimal-pad" placeholder="0.00" maxLength={LIMIT.credit}
                          error={item.credit_amount.trim() && !(parseFloat(item.credit_amount) >= 0) ? 'Enter a valid amount.' : undefined} />
                      </View>
                    </View>
                    <Text style={styles.itemTotal}>
                      Line total: {money((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (1 + VAT_RATE_MAP[item.vat_rate_type] / 100))}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                  <Feather name="plus" size={15} color={NAVY} />
                  <Text style={styles.addItemText}>Add Line Item</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.totalsCard}>
                <TotalRow label="Subtotal" value={`${currency} ${money(subtotal)}`} />
                <TotalRow label="VAT" value={`${currency} ${money(totalVat)}`} />
                <TotalRow label="Total" value={`${currency} ${money(grandTotal)}`} grand />
              </View>
            </>
          )}

          {/* ══ Step 3 — Details ══ */}
          {step === 3 && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Invoice Dates</Text>
                <View style={styles.row2}>
                  <View style={styles.col}><DatePickerField label="Issue Date" required value={issueDate} onChange={setIssueDate} /></View>
                  <View style={styles.col}><DatePickerField label="Due Date" optional value={dueDate} onChange={setDueDate} /></View>
                </View>
                <View style={styles.row2}>
                  <View style={styles.col}><DatePickerField label="Date of Supply" optional value={supplyDate} onChange={setSupplyDate} /></View>
                  <View style={styles.col}><DatePickerField label="Tax Payment Date" optional value={taxPaymentDate} onChange={setTaxPaymentDate} /></View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Document References</Text>

                {isCreditOrDebitNote && (
                  <View style={styles.originalInvoiceBanner}>
                    <View style={styles.originalInvoiceBannerHead}>
                      <Feather name="alert-triangle" size={13} color="#b45309" />
                      <Text style={styles.originalInvoiceBannerTitle}>
                        Original Invoice Reference — required for {selectedType?.title ?? 'this document'}
                      </Text>
                    </View>
                    <TextField
                      label="Original Invoice Number"
                      required
                      value={originalInvoiceNumber}
                      onChange={setOriginalInvoiceNumber}
                      placeholder="e.g. INV-202604-000001"
                      maxLength={LIMIT.originalInvoice}
                      error={detailErrors.originalInvoice}
                    />
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.label}>Invoice Number</Text>
                  <View style={styles.readonlyInput}>
                    <Text style={styles.readonlyText}>{invoiceNo}</Text>
                    <View style={styles.autoTag}><Feather name="zap" size={10} color="#1d4ed8" /><Text style={styles.autoTagText}>Auto</Text></View>
                  </View>
                </View>

                {/* ── UPDATED: All three now required ── */}
                <View style={styles.row2}>
                  <View style={styles.col}>
                    <TextField
                      label="Permit Number"
                      required
                      value={permitNumber}
                      onChange={setPermitNumber}
                      placeholder="e.g. UAE-PERMIT-20"
                      maxLength={LIMIT.permit}
                      error={detailErrors.permit}
                    />
                  </View>
                  <View style={styles.col}>
                    <TextField
                      label="Transaction ID"
                      required
                      value={transactionId}
                      onChange={setTransactionId}
                      placeholder="e.g. TXN-2024-00"
                      maxLength={LIMIT.txnId}
                      error={detailErrors.txnId}
                    />
                  </View>
                </View>
                <TextField
                  label="Purchase Order Number"
                  required
                  value={purchaseOrderNumber}
                  onChange={setPurchaseOrderNumber}
                  placeholder="Buyer PO reference"
                  maxLength={LIMIT.po}
                  error={detailErrors.po}
                />
                <TextField
                  label="GL / Account ID"
                  required
                  value={glAccountId}
                  onChange={setGlAccountId}
                  placeholder="e.g. GL-4100 or AR-001"
                  maxLength={LIMIT.gl}
                  error={glAccountId.trim() ? detailErrors.gl : undefined}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Currency & Financials</Text>
                <SelectField label="Currency" required value={currency} options={CURRENCIES} onChange={(v) => setCurrency(v as Currency)} />
                <View style={styles.field}>
                  <Text style={styles.label}>Exchange Rate to AED</Text>
                  <View style={styles.readonlyInput}><Text style={styles.readonlyText}>1.000000</Text></View>
                </View>
                <TextField label="Invoice Discount" value={discountAmount} onChange={(v) => setDiscountAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0.00" maxLength={LIMIT.discount} error={detailErrors.discount} />
                <TextField label="Notes" value={notes} onChange={setNotes} placeholder="Optional notes…" multiline maxLength={LIMIT.notes} />
              </View>
            </>
          )}

          {/* ══ Step 4 — Print Code (QR) ══ */}
          {step === 4 && (
            <View style={styles.card}>
              <View style={styles.qrHeadRow}>
                <Feather name="check-circle" size={18} color={GREEN} />
                <Text style={styles.qrHeadText}>Verification code ready</Text>
              </View>
              <Text style={styles.qrDesc}>
                This QR encodes the invoice number, seller & buyer TRN, total amount and date. Anyone can scan it to verify the invoice is genuine.
              </Text>
              <View style={styles.qrBox}>
                <QRCode value={qrData} size={170} />
              </View>
              <View style={styles.qrInfo}>
                <Text style={styles.qrInfoLine}>Invoice: <Text style={styles.qrInfoStrong}>{invoiceNo}</Text></Text>
                <Text style={styles.qrInfoLine}>Total: <Text style={styles.qrInfoStrong}>{currency} {money(grandTotal)}</Text></Text>
              </View>
            </View>
          )}

          {/* ══ Step 5 — Review ══ */}
          {step === 5 && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Review</Text>
                <ReviewRow label="Invoice #" value={invoiceNo} />
                {isCreditOrDebitNote && (
                  <ReviewRow label="Original Invoice #" value={originalInvoiceNumber || '—'} />
                )}
                <ReviewRow label="Supplier" value={selectedCompany?.name ?? '—'} />
                <ReviewRow label="Supplier location" value={supplierLocation || '—'} />
                <ReviewRow label="AR / AP" value={AR_AP_OPTIONS.find((o) => o.value === arType)?.label ?? '—'} />
                <ReviewRow label="Customer" value={selectedCustomer?.name ?? '—'} />
                <ReviewRow label="Customer location" value={customerLocation || '—'} />
                <ReviewRow label="Transaction" value={transactionType.toUpperCase()} />
                <ReviewRow label="Issue date" value={issueDate || '—'} />
                {dueDate ? <ReviewRow label="Due date" value={dueDate} /> : null}
                <ReviewRow label="Permit Number" value={permitNumber || '—'} />
                <ReviewRow label="Transaction ID" value={transactionId || '—'} />
                <ReviewRow label="Purchase Order #" value={purchaseOrderNumber || '—'} />
                <ReviewRow label="GL / Account ID" value={glAccountId || '—'} />
                <ReviewRow label="Items" value={String(items.filter((i) => i.description.trim()).length)} />
              </View>
              <View style={styles.totalsCard}>
                <TotalRow label="Subtotal" value={`${currency} ${money(subtotal)}`} />
                {discount > 0 && <TotalRow label="Discount" value={`− ${currency} ${money(discount)}`} />}
                {discount > 0 && <TotalRow label="Taxable" value={`${currency} ${money(taxable)}`} />}
                <TotalRow label="VAT" value={`${currency} ${money(totalVat)}`} />
                <TotalRow label="Total" value={`${currency} ${money(grandTotal)}`} grand />
              </View>
            </>
          )}

          <View style={{ height: 20 }} />
        </KeyboardAwareScrollView>

        {/* Footer nav */}
        {!pickerOpen && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
            <TouchableOpacity style={styles.backBtn} onPress={goBack} disabled={isPending}>
              <Text style={styles.backBtnText}>{step === 0 ? 'Cancel' : '‹ Back'}</Text>
            </TouchableOpacity>
            {isLast ? (
              <TouchableOpacity style={[styles.nextBtn, isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isPending}>
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.nextBtnText}>Submit & Create Invoice</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
                <Text style={styles.nextBtnText}>Next</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Submitting overlay */}
        <Modal visible={isPending} transparent animationType="fade">
          <View style={styles.submitOverlay}>
            <View style={styles.submitCard}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={styles.submitTitle}>Creating your invoice…</Text>
              <Text style={styles.submitSub}>Securely saving your invoice. Please don't close this screen.</Text>
            </View>
          </View>
        </Modal>
      </View>
    </PickerCtx.Provider>
  );
}

// ─── Reusable fields ──────────────────────────────────────────────────────────
function TextField({
  label, value, onChange, placeholder, required, keyboardType, multiline, maxLength, error,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  required?: boolean; keyboardType?: 'default' | 'decimal-pad' | 'numeric'; multiline?: boolean;
  maxLength?: number; error?: string;
}) {
  const showCounter = !!maxLength && value.length >= Math.floor(maxLength * 0.7);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}{required && <Text style={styles.req}> *</Text>}</Text>
        {showCounter && (
          <Text style={[styles.counter, value.length >= (maxLength as number) && styles.counterMax]}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, !!error && styles.inputError]}
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#94a3b8"
        keyboardType={keyboardType ?? 'default'} multiline={multiline} autoCapitalize="none"
        maxLength={maxLength}
      />
      {!!error && (
        <View style={styles.errRow}>
          <Feather name="alert-circle" size={12} color={ERROR} />
          <Text style={styles.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function DatePickerField({
  label, value, onChange, required, optional,
}: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; optional?: boolean;
}) {
  const [show, setShow] = useState(false);
  const reportOpen = useContext(PickerCtx);
  const dateVal = value ? new Date(value) : new Date();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required && <Text style={styles.req}> *</Text>}</Text>
      <TouchableOpacity style={styles.selectInput} onPress={() => { setShow(true); reportOpen(true); }} activeOpacity={0.7}>
        <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
          {value || (optional ? 'Optional' : 'Select date')}
        </Text>
        <Feather name="calendar" size={16} color={SLATE} />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={isNaN(dateVal.getTime()) ? new Date() : dateVal}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShow(false);
            reportOpen(false);
            if (e.type === 'set' && d) onChange(d.toISOString().slice(0, 10));
          }}
        />
      )}
    </View>
  );
}

function SelectField({
  label, value, options, onChange, placeholder, required, hint,
}: {
  label: string; value: string; options: Opt<string>[]; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const reportOpen = useContext(PickerCtx);
  const insets = useSafeAreaInsets();
  const openSheet = () => { setOpen(true); reportOpen(true); };
  const closeSheet = () => { setOpen(false); reportOpen(false); };
  const selected = options.find((o) => o.value === value);
  const showHint = hint && !value;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required && <Text style={styles.req}> *</Text>}</Text>
      <TouchableOpacity style={[styles.selectInput, showHint && styles.selectInputWarn]} onPress={openSheet} activeOpacity={0.7}>
        <Text style={selected ? styles.selectValue : styles.selectPlaceholder}>
          {selected?.label ?? placeholder ?? 'Select…'}
        </Text>
        <Feather name="chevron-down" size={16} color={SLATE} />
      </TouchableOpacity>
      {showHint && (
        <View style={styles.hintRow}>
          <Feather name="alert-triangle" size={12} color="#d97706" />
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      )}
      <Modal visible={open} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={styles.modalOverlay} onPress={closeSheet}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView>
              {options.length === 0 ? (
                <Text style={styles.modalEmpty}>No options available</Text>
              ) : (
                options.map((o) => {
                  const active = o.value === value;
                  return (
                    <TouchableOpacity key={o.value} style={[styles.modalOption, active && styles.modalOptionActive]}
                      onPress={() => { onChange(o.value); closeSheet(); }}>
                      <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>{o.label}</Text>
                      {active && <Feather name="check" size={16} color={NAVY} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TotalRow({ label, value, grand }: { label: string; value: string; grand?: boolean }) {
  return (
    <View style={[styles.totalRow, grand && styles.grandRow]}>
      <Text style={[styles.totalLabel, grand && styles.grandLabel]}>{label}</Text>
      <Text style={[styles.totalValue, grand && styles.grandValue]}>{value}</Text>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },

  stepperCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  stepsWrap: { position: 'relative', justifyContent: 'center', height: 26, marginBottom: 12 },
  stepsLineBg: { position: 'absolute', left: 12, right: 12, height: 2, backgroundColor: '#e2e8f0', top: 12 },
  stepsLineFill: { position: 'absolute', left: 12, height: 2, backgroundColor: GREEN, top: 12 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: GREEN, borderColor: GREEN },
  dotActive: { backgroundColor: NAVY, borderColor: NAVY },
  dotNum: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  dotNumActive: { color: '#fff' },
  stepHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepHeadIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  stepHeadTitle: { fontSize: 16, fontWeight: '800', color: NAVY },
  stepHeadSub: { fontSize: 12, color: SLATE, marginTop: 1 },

  restoreBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  restoreTitle: { fontSize: 14, fontWeight: '800', color: '#1e3a8a' },
  restoreSub: { fontSize: 12, color: '#3b82f6', marginTop: 2 },
  restoreActions: { gap: 10, alignItems: 'flex-end' },
  restoreRestore: { fontSize: 13, fontWeight: '800', color: '#1d4ed8' },
  restoreDiscard: { fontSize: 13, fontWeight: '700', color: SLATE },

  autoStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 2 },
  autoStatusText: { fontSize: 12, color: SLATE, fontWeight: '600' },

  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: NAVY, marginBottom: 12 },

  typeBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0a2540', borderRadius: 14, padding: 14, marginBottom: 14 },
  typeBannerIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  typeBannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  typeBannerSub: { fontSize: 12, color: '#cbd5e1', marginTop: 2 },
  typeBannerTags: { gap: 5, alignItems: 'flex-end' },
  typeChip: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  typeChipText: { fontSize: 10.5, fontWeight: '800', color: '#e2e8f0' },

  companyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, marginBottom: 14 },
  companyLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  companyLogoText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  companyName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  companySub: { fontSize: 12, color: SLATE, marginTop: 2 },

  field: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, flexShrink: 1, marginRight: 6 },
  counter: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 6, flexShrink: 0 },
  counterMax: { color: ERROR },
  req: { color: ERROR, fontWeight: '700' },
  input: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f9fafc', color: '#0f172a' },
  inputError: { borderColor: ERROR, backgroundColor: '#fef2f2' },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errText: { fontSize: 12, color: ERROR, fontWeight: '600', flex: 1 },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 16 },
  col: { flex: 1 },

  readonlyInput: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readonlyText: { fontSize: 14, color: '#475569', fontWeight: '700' },
  autoTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  autoTagText: { fontSize: 10, fontWeight: '800', color: '#1d4ed8' },

  selectInput: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f9fafc', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectInputWarn: { borderColor: '#fcd34d' },
  selectValue: { fontSize: 14, color: '#0f172a' },
  selectPlaceholder: { fontSize: 14, color: '#94a3b8' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  hintText: { fontSize: 12, color: '#b45309', fontWeight: '600' },

  originalInvoiceBanner: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, padding: 14, marginBottom: 16 },
  originalInvoiceBannerHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  originalInvoiceBannerTitle: { fontSize: 12.5, fontWeight: '700', color: '#b45309', flex: 1, flexWrap: 'wrap' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, maxHeight: '70%' },
  modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 12 },
  modalEmpty: { fontSize: 14, color: SLATE, paddingVertical: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10 },
  modalOptionActive: { backgroundColor: '#eef2f8' },
  modalOptionText: { fontSize: 15, color: '#334155' },
  modalOptionTextActive: { color: NAVY, fontWeight: '700' },

  itemBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: '#fcfdfe' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemHeaderText: { fontSize: 12, fontWeight: '800', color: SLATE, letterSpacing: 0.5 },
  removeText: { fontSize: 12, color: ERROR, fontWeight: '700' },
  itemTotal: { fontSize: 12, color: SLATE, fontWeight: '600', textAlign: 'right', marginTop: 2 },
  addItemBtn: { flexDirection: 'row', gap: 6, borderWidth: 1.5, borderColor: NAVY, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  addItemText: { color: NAVY, fontWeight: '700', fontSize: 14 },

  totalsCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: SLATE },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
  grandRow: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 6, paddingTop: 10 },
  grandLabel: { fontSize: 16, fontWeight: '800', color: NAVY },
  grandValue: { fontSize: 16, fontWeight: '800', color: NAVY },

  qrHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qrHeadText: { fontSize: 15, fontWeight: '800', color: GREEN },
  qrDesc: { fontSize: 13, color: SLATE, lineHeight: 19, marginBottom: 16 },
  qrBox: { alignSelf: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  qrInfo: { marginTop: 16, alignItems: 'center', gap: 3 },
  qrInfoLine: { fontSize: 13, color: SLATE },
  qrInfoStrong: { fontWeight: '800', color: '#0f172a' },

  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 16 },
  reviewLabel: { fontSize: 13, color: SLATE },
  reviewValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1, textAlign: 'right' },

  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDER },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', justifyContent: 'center' },
  backBtnText: { color: SLATE, fontWeight: '700', fontSize: 14 },
  nextBtn: { flex: 1, flexDirection: 'row', gap: 8, backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  submitOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  submitCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 320 },
  submitTitle: { fontSize: 16, fontWeight: '800', color: NAVY, marginTop: 16 },
  submitSub: { fontSize: 13, color: SLATE, textAlign: 'center', marginTop: 6, lineHeight: 19 },
});