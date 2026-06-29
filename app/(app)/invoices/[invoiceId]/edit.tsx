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
import { useCompanies } from '../../../../src/hooks/useCompanies';
import { useCustomers } from '../../../../src/hooks/useCustomers';
import {
  useInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
} from '../../../../src/hooks/useInvoices';
import type {
  InvoiceType,
  TransactionType,
  Currency,
  PaymentMeansCode,
  UpdateInvoicePayload,
} from '../../../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';

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

export default function EditInvoiceScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const router = useRouter();

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: companies } = useCompanies();
  const { mutateAsync: updateInvoice, isPending: isSaving } = useUpdateInvoice(invoiceId);
  const { mutateAsync: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();

  // The invoice payload carries company_trn (not id); match against the company
  // list to resolve the company id and load its customers.
  const company = companies?.find((c) => c.trn === invoice?.company_trn);
  const { data: customerData } = useCustomers({ company_id: company?.id ?? '' });
  const customerOptions: Opt<string>[] = (customerData?.results ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('tax_invoice');
  const [transactionType, setTransactionType] = useState<TransactionType>('b2b');
  const [issueDate, setIssueDate] = useState('');
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
  const [hydrated, setHydrated] = useState(false);

  // Prefill once the invoice loads
  useEffect(() => {
    if (invoice && !hydrated) {
      setCustomerId(invoice.customer ?? '');
      setInvoiceType(invoice.invoice_type);
      setTransactionType(invoice.transaction_type);
      setIssueDate(invoice.issue_date ?? '');
      setDueDate(invoice.due_date ?? '');
      setSupplyDate(invoice.supply_date ?? '');
      setSupplyDateEnd(invoice.supply_date_end ?? '');
      setContractReference(invoice.contract_reference ?? '');
      setCurrency(invoice.currency);
      setDiscountAmount(
        invoice.discount_amount && Number(invoice.discount_amount) > 0
          ? String(invoice.discount_amount)
          : ''
      );
      setPaymentMeansCode(invoice.payment_means_code);
      setReferenceNumber(invoice.reference_number ?? '');
      setPurchaseOrderNumber(invoice.purchase_order_number ?? '');
      setNotes(invoice.notes ?? '');
      setHydrated(true);
    }
  }, [invoice, hydrated]);

  const isContinuous = invoiceType === 'continuous_supply';
  const isCreditNote = invoiceType === 'credit_note';

  if (isLoading || !invoice) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Edit Invoice' }} />
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (!invoice.is_editable) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Edit Invoice' }} />
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.lockTitle}>This invoice can't be edited</Text>
        <Text style={styles.muted}>
          Only Draft invoices can be edited. This one is {invoice.status_display}.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleSave() {
    if (!customerId) {
      Alert.alert('Customer required', 'Please select a customer.');
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

    const payload: UpdateInvoicePayload = {
      customer_id: customerId,
      invoice_type: invoiceType,
      transaction_type: transactionType,
      currency,
      payment_means_code: paymentMeansCode,
      discount_amount: parseFloat(discountAmount) || 0,
      purchase_order_number: purchaseOrderNumber.trim(),
      notes: notes.trim(),
    };
    if (issueDate.trim()) payload.issue_date = issueDate.trim();
    if (dueDate.trim()) payload.due_date = dueDate.trim();
    if (isContinuous) {
      payload.supply_date = supplyDate.trim();
      payload.supply_date_end = supplyDateEnd.trim();
      payload.contract_reference = contractReference.trim();
    }
    if (isCreditNote) payload.reference_number = referenceNumber.trim();

    try {
      await updateInvoice(payload);
      router.back();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.detail ??
        'Could not save changes.';
      Alert.alert('Update failed', String(msg));
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete invoice',
      'This will soft-delete the draft invoice. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvoice(invoiceId);
              // Back to the list (detail no longer exists)
              router.replace('/invoices' as any);
            } catch (err: any) {
              const code = err?.response?.status;
              const msg =
                code === 403
                  ? 'Only company admins can delete invoices.'
                  : err?.response?.data?.error?.message ??
                    err?.response?.data?.detail ??
                    'Could not delete the invoice.';
              Alert.alert('Delete failed', String(msg));
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Edit Invoice' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>{invoice.invoice_number}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Details</Text>

          <SelectField label="Invoice Type" required value={invoiceType}
            options={INVOICE_TYPES} onChange={(v) => setInvoiceType(v as InvoiceType)} />

          <SelectField label="Customer" required value={customerId}
            options={customerOptions}
            placeholder={customerOptions.length ? 'Select a customer…' : 'No customers'}
            onChange={setCustomerId} />

          <SelectField label="Transaction Type" value={transactionType}
            options={TRANSACTION_TYPES} onChange={(v) => setTransactionType(v as TransactionType)} />

          <View style={styles.row2}>
            <View style={styles.col}>
              <DateField label="Issue Date" value={issueDate} onChange={setIssueDate} />
            </View>
            <View style={styles.col}>
              <DateField label="Due Date" optional value={dueDate} onChange={setDueDate} />
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
              <TextField label="Contract Reference" value={contractReference}
                onChange={setContractReference} placeholder="Contract document reference" />
            </>
          )}

          {isCreditNote && (
            <TextField label="Original Invoice Number" required value={referenceNumber}
              onChange={setReferenceNumber} placeholder="Invoice this credit note corrects" />
          )}

          <View style={styles.row2}>
            <View style={styles.col}>
              <SelectField label="Currency" value={currency}
                options={CURRENCIES} onChange={(v) => setCurrency(v as Currency)} />
            </View>
            <View style={styles.col}>
              <SelectField label="Payment Means" value={paymentMeansCode}
                options={PAYMENT_MEANS} onChange={(v) => setPaymentMeansCode(v as PaymentMeansCode)} />
            </View>
          </View>

          <TextField label="Purchase Order Number" value={purchaseOrderNumber}
            onChange={setPurchaseOrderNumber} placeholder="Buyer PO number (optional)" />
          <TextField label="Discount Amount" value={discountAmount}
            onChange={setDiscountAmount} keyboardType="decimal-pad" placeholder="0.00" />
          <TextField label="Notes" value={notes} onChange={setNotes}
            placeholder="Optional notes…" multiline />
        </View>

        <Text style={styles.hint}>
          Line items are managed separately — use “Manage Items” on the invoice.
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, isDeleting && styles.btnDisabled]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color={ERROR} />
          ) : (
            <Text style={styles.deleteText}>🗑  Delete Draft Invoice</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Reusable fields (same look as the create form) ────────────────────────────

function TextField({
  label, value, onChange, placeholder, required, keyboardType, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  required?: boolean; keyboardType?: 'default' | 'decimal-pad'; multiline?: boolean;
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
  label, value, onChange, required, optional,
}: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; optional?: boolean;
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
  label, value, options, onChange, placeholder, required,
}: {
  label: string; value: string; options: Opt<string>[]; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
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
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}>
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
                      onPress={() => { onChange(o.value); setOpen(false); }}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },

  backRow: { marginBottom: 6 },
  backText: { fontSize: 15, color: SLATE, fontWeight: '600' },
  subtitle: { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 12 },

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

  hint: { fontSize: 12, color: SLATE, fontStyle: 'italic', marginBottom: 14, paddingHorizontal: 4 },

  saveBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    marginTop: 12, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2',
  },
  deleteText: { color: ERROR, fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },

  emoji: { fontSize: 44, marginBottom: 12 },
  lockTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 8 },
  muted: { fontSize: 14, color: SLATE, textAlign: 'center', marginBottom: 20 },
  primaryBtn: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
