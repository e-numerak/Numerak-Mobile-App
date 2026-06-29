import { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { useCustomers } from '../../../src/hooks/useCustomers';
import { useCreateInvoice } from '../../../src/hooks/useInvoices';
import type {
  InvoiceType,
  TransactionType,
  Currency,
  VatRateType,
  PaymentMeansCode,
  CreateInvoicePayload,
  InlineInvoiceItemPayload,
} from '../../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';

// ── Option lists (values match backend constants) ──────────────────────────
type Opt<T extends string> = { value: T; label: string };

const INVOICE_TYPES: Opt<InvoiceType>[] = [
  { value: 'tax_invoice', label: 'Tax Invoice' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'commercial_invoice', label: 'Commercial Invoice' },
  { value: 'continuous_supply', label: 'Continuous Supply' },
];

const TRANSACTION_TYPES: Opt<TransactionType>[] = [
  { value: 'b2b', label: 'B2B — Business' },
  { value: 'b2g', label: 'B2G — Government' },
  { value: 'b2c', label: 'B2C — Consumer' },
];

const CURRENCIES: Opt<Currency>[] = [
  { value: 'AED', label: 'AED' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];

const PAYMENT_MEANS: Opt<PaymentMeansCode>[] = [
  { value: '30', label: 'Credit Transfer' },
  { value: '10', label: 'Cash' },
  { value: '20', label: 'Cheque' },
  { value: '48', label: 'Bank Card' },
  { value: '49', label: 'Direct Debit' },
  { value: '57', label: 'Standing Order' },
  { value: '58', label: 'SEPA Credit Transfer' },
];

const VAT_RATE_TYPES: Opt<VatRateType>[] = [
  { value: 'standard', label: 'Standard 5%' },
  { value: 'zero', label: 'Zero 0%' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'out_of_scope', label: 'Out of Scope' },
];

const VAT_RATE_MAP: Record<VatRateType, number> = {
  standard: 5,
  zero: 0,
  exempt: 0,
  out_of_scope: 0,
};

interface FormItem {
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  vat_rate_type: VatRateType;
}

const emptyItem = (): FormItem => ({
  item_name: '',
  description: '',
  quantity: '1',
  unit: '',
  unit_price: '',
  vat_rate_type: 'standard',
});

const today = () => new Date().toISOString().slice(0, 10);

function money(n: number): string {
  return n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const { data: companies } = useCompanies();
  const { mutateAsync: createInvoice, isPending } = useCreateInvoice();

  const [companyId, setCompanyId] = useState<string>(params.companyId ?? '');

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('tax_invoice');
  const [transactionType, setTransactionType] = useState<TransactionType>('b2b');
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [supplyDate, setSupplyDate] = useState('');
  const [supplyDateEnd, setSupplyDateEnd] = useState('');
  const [contractReference, setContractReference] = useState('');
  const [currency, setCurrency] = useState<Currency>('AED');
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMeansCode, setPaymentMeansCode] = useState<PaymentMeansCode>('30');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  // Default to first company if none passed
  useEffect(() => {
    if (!companyId && companies && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  const { data: customerData } = useCustomers({ company_id: companyId });
  const customers = customerData?.results ?? [];
  const customerOptions: Opt<string>[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const isContinuous = invoiceType === 'continuous_supply';
  const isCreditNote = invoiceType === 'credit_note';

  // ── Live totals ──────────────────────────────────────────────────────────
  const discount = parseFloat(discountAmount) || 0;
  const lineCalcs = items.map((it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    const net = qty * price;
    const rate = VAT_RATE_MAP[it.vat_rate_type] ?? 0;
    return { net, vat: (net * rate) / 100 };
  });
  const subtotal = lineCalcs.reduce((s, l) => s + l.net, 0);
  const taxable = Math.max(0, subtotal - discount);
  const totalVat = lineCalcs.reduce((s, l) => s + l.vat, 0);
  const grandTotal = taxable + totalVat;

  // ── Item helpers ─────────────────────────────────────────────────────────
  function updateItem(idx: number, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!companyId) {
      Alert.alert('Company required', 'Please select a company.');
      return;
    }
    if (!customerId) {
      Alert.alert('Customer required', 'Please select a customer for this invoice.');
      return;
    }
    if (isCreditNote && !referenceNumber.trim()) {
      Alert.alert('Reference required', 'Credit notes must include the original invoice number.');
      return;
    }
    if (isContinuous && (!supplyDate.trim() || !supplyDateEnd.trim())) {
      Alert.alert('Supply period required', 'Continuous supplies need both a start and end date.');
      return;
    }

    // Validate items
    const validItems: InlineInvoiceItemPayload[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const hasAny = it.description.trim() || it.unit_price.trim() || it.item_name.trim();
      if (!hasAny) continue; // skip fully-blank rows
      if (!it.description.trim()) {
        Alert.alert('Item error', `Item #${i + 1}: description is required.`);
        return;
      }
      const qty = parseFloat(it.quantity);
      if (!(qty > 0)) {
        Alert.alert('Item error', `Item #${i + 1}: quantity must be greater than 0.`);
        return;
      }
      const price = parseFloat(it.unit_price);
      if (!(price >= 0)) {
        Alert.alert('Item error', `Item #${i + 1}: unit price cannot be negative.`);
        return;
      }
      validItems.push({
        item_name: it.item_name.trim() || undefined,
        description: it.description.trim(),
        quantity: qty,
        unit: it.unit.trim() || undefined,
        unit_price: price,
        vat_rate_type: it.vat_rate_type,
        sort_order: i,
      });
    }

    if (validItems.length === 0) {
      Alert.alert('Items required', 'Add at least one line item with a description and price.');
      return;
    }

    // Build payload — omit empty optional fields (backend rejects empty dates)
    const payload: CreateInvoicePayload = {
      company_id: companyId,
      customer_id: customerId,
      invoice_type: invoiceType,
      transaction_type: transactionType,
      currency,
      payment_means_code: paymentMeansCode,
      items: validItems,
    };
    if (issueDate.trim()) payload.issue_date = issueDate.trim();
    if (dueDate.trim()) payload.due_date = dueDate.trim();
    if (isContinuous) {
      payload.supply_date = supplyDate.trim();
      payload.supply_date_end = supplyDateEnd.trim();
      if (contractReference.trim()) payload.contract_reference = contractReference.trim();
    }
    if (discount > 0) payload.discount_amount = discount;
    if (isCreditNote) payload.reference_number = referenceNumber.trim();
    if (purchaseOrderNumber.trim()) payload.purchase_order_number = purchaseOrderNumber.trim();
    if (notes.trim()) payload.notes = notes.trim();

    try {
      const created = await createInvoice(payload);
      if (created?.id) {
        router.replace(`/invoices/${created.id}` as any);
      } else {
        router.back();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.detail ??
        'Failed to create invoice. Please check the fields and try again.';
      Alert.alert('Create failed', String(msg));
    }
  }

  const selectedCompany = companies?.find((c) => c.id === companyId);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Create Invoice' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Company */}
        {companies && companies.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {companies.map((c) => {
                const active = c.id === companyId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setCompanyId(c.id);
                      setCustomerId('');
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <Text style={styles.companyLabel}>{selectedCompany?.name}</Text>
        )}

        {/* Invoice details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Details</Text>

          <SelectField
            label="Invoice Type"
            required
            value={invoiceType}
            options={INVOICE_TYPES}
            onChange={(v) => setInvoiceType(v as InvoiceType)}
          />

          <SelectField
            label="Customer"
            required
            value={customerId}
            options={customerOptions}
            placeholder={customers.length ? 'Select a customer…' : 'No customers — add one first'}
            onChange={setCustomerId}
          />

          <SelectField
            label="Transaction Type"
            value={transactionType}
            options={TRANSACTION_TYPES}
            onChange={(v) => setTransactionType(v as TransactionType)}
          />

          <View style={styles.row2}>
            <View style={styles.col}>
              <DateField label="Issue Date" value={issueDate} onChange={setIssueDate} />
            </View>
            <View style={styles.col}>
              <DateField label="Due Date" value={dueDate} onChange={setDueDate} optional />
            </View>
          </View>

          {isContinuous && (
            <>
              <View style={styles.row2}>
                <View style={styles.col}>
                  <DateField label="Supply Start" required value={supplyDate} onChange={setSupplyDate} />
                </View>
                <View style={styles.col}>
                  <DateField label="Supply End" required value={supplyDateEnd} onChange={setSupplyDateEnd} />
                </View>
              </View>
              <TextField
                label="Contract Reference"
                value={contractReference}
                onChange={setContractReference}
                placeholder="Contract document reference"
              />
            </>
          )}

          {isCreditNote && (
            <TextField
              label="Original Invoice Number"
              required
              value={referenceNumber}
              onChange={setReferenceNumber}
              placeholder="Invoice this credit note corrects"
            />
          )}

          <View style={styles.row2}>
            <View style={styles.col}>
              <SelectField
                label="Currency"
                value={currency}
                options={CURRENCIES}
                onChange={(v) => setCurrency(v as Currency)}
              />
            </View>
            <View style={styles.col}>
              <SelectField
                label="Payment Means"
                value={paymentMeansCode}
                options={PAYMENT_MEANS}
                onChange={(v) => setPaymentMeansCode(v as PaymentMeansCode)}
              />
            </View>
          </View>

          <TextField
            label="Purchase Order Number"
            value={purchaseOrderNumber}
            onChange={setPurchaseOrderNumber}
            placeholder="Buyer PO number (optional)"
          />
        </View>

        {/* Line items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Line Items</Text>
          {items.map((item, idx) => (
            <View key={idx} style={styles.itemBox}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemHeaderText}>Item #{idx + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(idx)}>
                    <Text style={styles.removeText}>🗑 Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextField
                label="Item Name"
                value={item.item_name}
                onChange={(v) => updateItem(idx, { item_name: v })}
                placeholder="e.g. IT Consulting"
              />
              <TextField
                label="Description"
                required
                value={item.description}
                onChange={(v) => updateItem(idx, { description: v })}
                placeholder="Description of goods / services"
              />

              <View style={styles.row2}>
                <View style={styles.col}>
                  <TextField
                    label="Quantity"
                    required
                    value={item.quantity}
                    onChange={(v) => updateItem(idx, { quantity: v })}
                    keyboardType="decimal-pad"
                    placeholder="1"
                  />
                </View>
                <View style={styles.col}>
                  <TextField
                    label="Unit"
                    value={item.unit}
                    onChange={(v) => updateItem(idx, { unit: v })}
                    placeholder="pcs / hr / kg"
                  />
                </View>
              </View>

              <View style={styles.row2}>
                <View style={styles.col}>
                  <TextField
                    label="Unit Price"
                    required
                    value={item.unit_price}
                    onChange={(v) => updateItem(idx, { unit_price: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
                <View style={styles.col}>
                  <SelectField
                    label="VAT Rate"
                    value={item.vat_rate_type}
                    options={VAT_RATE_TYPES}
                    onChange={(v) => updateItem(idx, { vat_rate_type: v as VatRateType })}
                  />
                </View>
              </View>

              <Text style={styles.itemTotal}>
                Line total: {money((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (1 + VAT_RATE_MAP[item.vat_rate_type] / 100))}
              </Text>
            </View>
          ))}

          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Text style={styles.addItemText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Discount + Notes */}
        <View style={styles.card}>
          <TextField
            label="Discount Amount"
            value={discountAmount}
            onChange={setDiscountAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <TextField
            label="Notes"
            value={notes}
            onChange={setNotes}
            placeholder="Optional notes…"
            multiline
          />
        </View>

        {/* Totals */}
        <View style={styles.totalsCard}>
          <TotalRow label="Subtotal" value={`${currency} ${money(subtotal)}`} />
          {discount > 0 && <TotalRow label="Discount" value={`− ${currency} ${money(discount)}`} />}
          {discount > 0 && <TotalRow label="Taxable" value={`${currency} ${money(taxable)}`} />}
          <TotalRow label="VAT" value={`${currency} ${money(totalVat)}`} />
          <TotalRow label="Total" value={`${currency} ${money(grandTotal)}`} grand />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Invoice (Draft)</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Reusable fields ──────────────────────────────────────────────────────────

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        autoCapitalize="none"
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  required,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={optional ? 'YYYY-MM-DD (optional)' : 'YYYY-MM-DD'}
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  options: Opt<string>[];
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
      <TouchableOpacity style={styles.selectInput} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={selected ? styles.selectValue : styles.selectPlaceholder}>
          {selected?.label ?? placeholder ?? 'Select…'}
        </Text>
        <Text style={styles.selectChevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView>
              {options.length === 0 ? (
                <Text style={styles.modalEmpty}>No options available</Text>
              ) : (
                options.map((o) => {
                  const active = o.value === value;
                  return (
                    <TouchableOpacity
                      key={o.value}
                      style={[styles.modalOption, active && styles.modalOptionActive]}
                      onPress={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                    >
                      <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>
                        {o.label}
                      </Text>
                      {active && <Text style={styles.modalCheck}>✓</Text>}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },

  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 8 },
  companyLabel: { fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 12 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: NAVY, marginBottom: 12 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  req: { color: ERROR, fontWeight: '700' },
  input: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    backgroundColor: '#f9fafc', color: '#0f172a',
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },

  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  selectInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f9fafc',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectValue: { fontSize: 14, color: '#0f172a' },
  selectPlaceholder: { fontSize: 14, color: '#94a3b8' },
  selectChevron: { fontSize: 12, color: SLATE },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#cbd5e1', marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 12 },
  modalEmpty: { fontSize: 14, color: SLATE, paddingVertical: 20, textAlign: 'center' },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10,
  },
  modalOptionActive: { backgroundColor: '#eef2f8' },
  modalOptionText: { fontSize: 15, color: '#334155' },
  modalOptionTextActive: { color: NAVY, fontWeight: '700' },
  modalCheck: { fontSize: 16, color: NAVY, fontWeight: '800' },

  itemBox: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    padding: 12, marginBottom: 12, backgroundColor: '#fcfdfe',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemHeaderText: { fontSize: 12, fontWeight: '700', color: SLATE, letterSpacing: 0.5 },
  removeText: { fontSize: 12, color: ERROR, fontWeight: '600' },
  itemTotal: { fontSize: 12, color: SLATE, fontWeight: '600', textAlign: 'right', marginTop: 2 },

  addItemBtn: {
    borderWidth: 1.5, borderColor: NAVY, borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  addItemText: { color: NAVY, fontWeight: '700', fontSize: 14 },

  totalsCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 14,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: SLATE },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
  grandRow: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 6, paddingTop: 10 },
  grandLabel: { fontSize: 16, fontWeight: '800', color: NAVY },
  grandValue: { fontSize: 16, fontWeight: '800', color: NAVY },

  submitBtn: {
    backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
