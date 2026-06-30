import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  useInvoice,
  useInvoicePayments,
  useRecordPayment,
} from '../../../../src/hooks/useInvoices';
import type { InvoicePayment, RecordPaymentPayload } from '../../../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const GREEN = '#16a34a';
const ERROR = '#dc2626';

const METHODS: { value: string; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

function money(value: string | number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const methodLabel = (m: string) => METHODS.find((x) => x.value === m)?.label ?? m;

export default function InvoicePaymentsScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const insets = useSafeAreaInsets();

  const { data: invoice } = useInvoice(invoiceId);
  const { data: payments, isLoading, isError, refetch } = useInvoicePayments(invoiceId);
  const list = Array.isArray(payments) ? payments : [];
  const recordPayment = useRecordPayment(invoiceId);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const cur = invoice?.currency ?? 'AED';
  const balanceDue = Number(invoice?.balance_due ?? 0);
  const canRecord = balanceDue > 0;

  function openForm() {
    setAmount(balanceDue > 0 ? String(invoice?.balance_due) : '');
    setMethod('bank_transfer');
    setPayDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setNotes('');
    setOpen(true);
  }

  async function handleRecord() {
    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      Alert.alert('Invalid amount', 'Enter a valid payment amount.');
      return;
    }
    const payload: RecordPaymentPayload = {
      amount: amt,
      method,
      payment_date: payDate.trim(),
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      await recordPayment.mutateAsync(payload);
      setOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.detail ??
        'Could not record the payment.';
      Alert.alert('Failed', String(msg));
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Payments' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {invoice && (
          <>
            <Text style={styles.subtitle}>{invoice.invoice_number}</Text>

            {/* AR summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>{cur} {money(invoice.total_amount)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Paid</Text>
                <Text style={[styles.summaryValue, { color: GREEN }]}>{cur} {money(invoice.amount_paid)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Balance</Text>
                <Text style={[styles.summaryValue, { color: balanceDue > 0 ? ERROR : GREEN }]}>
                  {cur} {money(invoice.balance_due)}
                </Text>
              </View>
            </View>

            {canRecord && (
              <TouchableOpacity style={styles.recordBtn} onPress={openForm}>
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.recordBtnText}>Record Payment</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* History */}
        <Text style={styles.sectionLabel}>PAYMENT HISTORY</Text>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Feather name="alert-triangle" size={40} color={ERROR} style={{ marginBottom: 12 }} />
            <Text style={styles.muted}>Couldn't load payments.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.center}>
            <Feather name="credit-card" size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.muted}>No payments recorded yet.</Text>
          </View>
        ) : (
          list.map((p: InvoicePayment) => (
            <View key={p.id} style={styles.payCard}>
              <View style={styles.payTop}>
                <Text style={styles.payAmount}>{cur} {money(p.amount)}</Text>
                <View style={styles.methodPill}>
                  <Text style={styles.methodPillText}>{methodLabel(p.method)}</Text>
                </View>
              </View>
              <View style={styles.payMetaRow}>
                <Feather name="calendar" size={13} color={SLATE} />
                <Text style={styles.payMeta}>{p.payment_date}</Text>
                {p.reference ? (
                  <>
                    <Text style={styles.payDot}>·</Text>
                    <Text style={styles.payMeta}>Ref: {p.reference}</Text>
                  </>
                ) : null}
              </View>
              {p.notes ? <Text style={styles.payNotes}>{p.notes}</Text> : null}
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Record payment modal */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Record Payment</Text>
            <Text style={styles.sheetSub}>
              Balance due: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{cur} {money(invoice?.balance_due)}</Text>
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Method</Text>
              <View style={styles.methodWrap}>
                {METHODS.map((m) => {
                  const active = m.value === method;
                  return (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.methodChip, active && styles.methodChipActive]}
                      onPress={() => setMethod(m.value)}
                    >
                      <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Payment Date</Text>
              <TextInput
                style={styles.input}
                value={payDate}
                onChangeText={setPayDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.label}>Reference (optional)</Text>
              <TextInput
                style={styles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="Txn / cheque no."
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any details…"
                placeholderTextColor="#94a3b8"
                multiline
              />

              <TouchableOpacity
                style={[styles.saveBtn, recordPayment.isPending && { opacity: 0.6 }]}
                onPress={handleRecord}
                disabled={recordPayment.isPending}
              >
                {recordPayment.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Payment</Text>
                )}
              </TouchableOpacity>
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
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },

  subtitle: { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 12 },

  summaryCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: BORDER, padding: 16, alignItems: 'center',
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: BORDER },
  summaryLabel: { fontSize: 11, color: SLATE, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  recordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14, marginTop: 14,
  },
  recordBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginTop: 22, marginBottom: 10 },

  payCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  payTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payAmount: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  methodPill: { backgroundColor: '#eef2f8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  methodPillText: { fontSize: 11, color: NAVY, fontWeight: '700' },
  payMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  payMeta: { fontSize: 12, color: SLATE },
  payDot: { fontSize: 12, color: SLATE },
  payNotes: { fontSize: 13, color: '#334155', marginTop: 6 },

  muted: { fontSize: 14, color: SLATE },
  retryBtn: { backgroundColor: NAVY, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, marginTop: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: NAVY },
  sheetSub: { fontSize: 13, color: SLATE, marginTop: 4, marginBottom: 8 },

  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    backgroundColor: '#f9fafc', color: '#0f172a',
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },

  methodWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  methodChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  methodChipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  methodChipTextActive: { color: '#fff' },

  saveBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
