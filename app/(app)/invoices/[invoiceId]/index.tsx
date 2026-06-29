import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useInvoice,
  useSubmitInvoice,
  useCancelInvoice,
  useDeactivateInvoice,
  useCreateCreditNote,
} from '../../../../src/hooks/useInvoices';
import { useCompanies } from '../../../../src/hooks/useCompanies';
import { InvoiceStatusBadge } from '../../../../src/components/InvoiceStatusBadge';
import type { InvoiceItem } from '../../../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';

function errMsg(err: any, fallback: string): string {
  return String(
    err?.response?.data?.error?.message ?? err?.response?.data?.detail ?? fallback
  );
}

/** Format a decimal string the way the web does (en-AE, 2 dp). */
function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvoiceDetailScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const router = useRouter();

  const { data: invoice, isLoading, isError, refetch } = useInvoice(invoiceId);
  const { data: companies } = useCompanies();

  const submit = useSubmitInvoice(invoiceId);
  const cancel = useCancelInvoice(invoiceId);
  const deactivate = useDeactivateInvoice(invoiceId);
  const creditNote = useCreateCreditNote(invoiceId);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const insets = useSafeAreaInsets();

  const busy =
    submit.isPending || cancel.isPending || deactivate.isPending || creditNote.isPending;

  function handleSubmit() {
    Alert.alert('Submit invoice', 'Submit this invoice for processing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          try {
            await submit.mutateAsync();
          } catch (err: any) {
            Alert.alert('Submit failed', errMsg(err, 'Submission failed. Please try again.'));
          }
        },
      },
    ]);
  }

  function handleCancel() {
    Alert.alert('Cancel invoice', 'Cancel this invoice? This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel.mutateAsync();
          } catch (err: any) {
            Alert.alert('Cancel failed', errMsg(err, 'Cancellation failed.'));
          }
        },
      },
    ]);
  }

  function handleCreditNote() {
    Alert.alert(
      'Issue credit note',
      'A draft credit note will be created that you can review and submit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            try {
              const created = await creditNote.mutateAsync();
              if (created?.id) router.push(`/invoices/${created.id}` as any);
            } catch (err: any) {
              Alert.alert('Failed', errMsg(err, 'Could not create credit note.'));
            }
          },
        },
      ]
    );
  }

  async function handleDeactivate() {
    if (!deactivateReason.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for deactivation.');
      return;
    }
    try {
      await deactivate.mutateAsync(deactivateReason.trim());
      setDeactivateOpen(false);
      setDeactivateReason('');
    } catch (err: any) {
      Alert.alert('Deactivation failed', errMsg(err, 'Deactivation failed.'));
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <Stack.Screen options={{ title: 'Invoice' }} />
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (isError || !invoice) {
    return (
      <View style={styles.centerScreen}>
        <Stack.Screen options={{ title: 'Invoice' }} />
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Couldn't load invoice</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Supplier address/contact come from the matching company (matched by TRN),
  // mirroring the web — the invoice payload only carries name/TRN/logo.
  const co = companies?.find((c) => c.trn === invoice.company_trn);
  const supplierAddr = co
    ? [
        co.street_address,
        [co.city, co.emirate?.replace('_', ' ')].filter(Boolean).join(', '),
        co.po_box ? `P.O. Box ${co.po_box}` : '',
        co.country || 'United Arab Emirates',
      ]
        .filter(Boolean)
        .join(', ')
    : '';
  const buyerAddr = [
    invoice.customer_address,
    invoice.customer_city,
    invoice.customer_country,
  ]
    .filter(Boolean)
    .join(', ');

  const balanceDue = Number(invoice.balance_due ?? 0);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: invoice.invoice_number }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Back */}
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <InvoiceStatusBadge status={invoice.status} label={invoice.status_display} />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{invoice.type_display}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{invoice.transaction_type?.toUpperCase()}</Text>
          {balanceDue > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>
                Balance:{' '}
                <Text style={styles.metaStrong}>
                  {invoice.currency} {money(invoice.balance_due)}
                </Text>
              </Text>
            </>
          )}
        </View>
        {invoice.is_overdue && (
          <View style={styles.overduePill}>
            <Text style={styles.overdueText}>OVERDUE {invoice.days_overdue}d</Text>
          </View>
        )}

        {invoice.is_editable && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/invoices/${invoice.id}/edit` as any)}
          >
            <Text style={styles.editBtnText}>✎  Edit Invoice</Text>
          </TouchableOpacity>
        )}

        {/* Deactivated banner */}
        {invoice.status === 'deactivated' && (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>🚫 This invoice has been deactivated.</Text>
            {invoice.deactivation_reason ? (
              <Text style={styles.bannerBody}>Reason: {invoice.deactivation_reason}</Text>
            ) : null}
          </View>
        )}

        {/* Actions */}
        {(() => {
          const showCreditNote =
            invoice.invoice_type !== 'credit_note' &&
            ['submitted', 'validated', 'paid', 'partially_paid'].includes(invoice.status);
          const showDeactivate = invoice.is_deactivatable && !invoice.is_cancellable;
          const anyAction =
            invoice.is_submittable || invoice.is_cancellable || showCreditNote || showDeactivate;
          if (!anyAction) return null;

          return (
            <View style={styles.actionsWrap}>
              {busy && <ActivityIndicator color={NAVY} style={{ marginBottom: 8 }} />}

              {invoice.is_submittable && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={handleSubmit}
                  disabled={busy}
                >
                  <Text style={styles.actionPrimaryText}>📤  Submit</Text>
                </TouchableOpacity>
              )}

              {showCreditNote && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionSecondary]}
                  onPress={handleCreditNote}
                  disabled={busy}
                >
                  <Text style={styles.actionSecondaryText}>📝  Issue Credit Note</Text>
                </TouchableOpacity>
              )}

              {invoice.is_cancellable && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionDanger]}
                  onPress={handleCancel}
                  disabled={busy}
                >
                  <Text style={styles.actionDangerText}>✖  Cancel</Text>
                </TouchableOpacity>
              )}

              {showDeactivate && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionDanger]}
                  onPress={() => {
                    setDeactivateReason('');
                    setDeactivateOpen(true);
                  }}
                  disabled={busy}
                >
                  <Text style={styles.actionDangerText}>🚫  Deactivate</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* Supplier */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SUPPLIER</Text>
          <View style={styles.partyRow}>
            <View style={[styles.logo, { backgroundColor: '#2563eb' }]}>
              <Text style={styles.logoText}>
                {(invoice.company_name || '?').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyName}>{invoice.company_name}</Text>
              {co?.legal_name && co.legal_name !== invoice.company_name ? (
                <Text style={styles.partySub}>{co.legal_name}</Text>
              ) : null}
              <Text style={styles.partySub}>TRN: {invoice.company_trn}</Text>
              {supplierAddr ? <Text style={styles.partySub}>{supplierAddr}</Text> : null}
              {co?.phone ? <Text style={styles.partySub}>{co.phone}</Text> : null}
              {co?.email ? <Text style={styles.partySub}>{co.email}</Text> : null}
            </View>
          </View>
        </View>

        {/* Buyer */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>BUYER</Text>
          <View style={styles.partyRow}>
            <View style={[styles.logo, { backgroundColor: '#0d9488' }]}>
              <Text style={styles.logoText}>
                {(invoice.customer_name || '?').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyName}>{invoice.customer_name}</Text>
              {invoice.customer_trn ? (
                <Text style={styles.partySub}>TRN: {invoice.customer_trn}</Text>
              ) : null}
              {buyerAddr ? <Text style={styles.partySub}>{buyerAddr}</Text> : null}
              {invoice.customer_phone ? (
                <Text style={styles.partySub}>{invoice.customer_phone}</Text>
              ) : null}
              {invoice.customer_email ? (
                <Text style={styles.partySub}>{invoice.customer_email}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.card}>
          <View style={styles.datesRow}>
            <DateCol label="Issue Date" value={invoice.issue_date} />
            <DateCol label="Due Date" value={invoice.due_date ?? '—'} />
            <DateCol label="Supply Date" value={invoice.supply_date ?? '—'} />
          </View>
          {invoice.invoice_type === 'continuous_supply' &&
            (invoice.supply_date_end || invoice.contract_reference) && (
              <View style={[styles.datesRow, styles.datesRowDivider]}>
                <DateCol label="Period End" value={invoice.supply_date_end ?? '—'} />
                {invoice.contract_reference ? (
                  <DateCol label="Contract Ref" value={invoice.contract_reference} flex={2} />
                ) : null}
              </View>
            )}
        </View>

        {/* Line items */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>LINE ITEMS</Text>
            {invoice.is_editable && (
              <TouchableOpacity
                onPress={() => router.push(`/invoices/${invoice.id}/items` as any)}
              >
                <Text style={styles.manageLink}>Manage Items ›</Text>
              </TouchableOpacity>
            )}
          </View>
          {invoice.items.map((item) => (
            <LineItemRow key={item.id} item={item} />
          ))}

          {/* Totals */}
          <View style={styles.totalsBlock}>
            <TotalRow label="Subtotal" value={money(invoice.subtotal)} />
            {Number(invoice.discount_amount) > 0 && (
              <TotalRow label="Discount" value={`−${money(invoice.discount_amount)}`} negative />
            )}
            <TotalRow label="VAT" value={money(invoice.total_vat)} />
            <TotalRow
              label={`Total (${invoice.currency})`}
              value={money(invoice.total_amount)}
              grand
            />
          </View>
        </View>

        {/* ASP submission */}
        {invoice.asp_submission_id ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ASP SUBMISSION (CORNER 2)</Text>
            <Text style={styles.aspLabel}>Submission ID</Text>
            <Text style={styles.aspValue}>{invoice.asp_submission_id}</Text>
            {invoice.asp_submitted_at ? (
              <Text style={styles.partySub}>
                {new Date(invoice.asp_submitted_at).toLocaleString('en-AE')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>NOTES</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Deactivate reason modal */}
      <Modal
        visible={deactivateOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDeactivateOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setDeactivateOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>🚫  Deactivate invoice</Text>
            <Text style={styles.sheetSub}>
              Provide a reason. The buyer will see the deactivated status and this reason.
            </Text>
            <TextInput
              style={styles.reasonInput}
              value={deactivateReason}
              onChangeText={setDeactivateReason}
              placeholder="Reason for deactivating this invoice…"
              placeholderTextColor="#94a3b8"
              multiline
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setDeactivateOpen(false)}
                disabled={deactivate.isPending}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetConfirmBtn, deactivate.isPending && { opacity: 0.6 }]}
                onPress={handleDeactivate}
                disabled={deactivate.isPending}
              >
                {deactivate.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sheetConfirmText}>Deactivate</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DateCol({
  label,
  value,
  flex = 1,
}: {
  label: string;
  value: string;
  flex?: number;
}) {
  return (
    <View style={{ flex }}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{value}</Text>
    </View>
  );
}

function LineItemRow({ item }: { item: InvoiceItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemTop}>
        <Text style={styles.itemDesc}>{item.description}</Text>
        <Text style={styles.itemTotal}>{money(item.total_amount)}</Text>
      </View>
      <Text style={styles.itemMeta}>
        {item.quantity}
        {item.unit ? ` ${item.unit}` : ''} × {money(item.unit_price)}
        {'   ·   '}
        VAT {item.vat_rate_type_display} ({Number(item.vat_rate)}%) = {money(item.vat_amount)}
      </Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  grand,
  negative,
}: {
  label: string;
  value: string;
  grand?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={[styles.totalRow, grand && styles.grandRow]}>
      <Text style={[styles.totalLabel, grand && styles.grandLabel]}>{label}</Text>
      <Text
        style={[
          styles.totalValue,
          grand && styles.grandValue,
          negative && styles.negativeValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
    padding: 24,
  },

  backRow: { marginBottom: 8 },
  backText: { fontSize: 15, color: SLATE, fontWeight: '600' },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  invoiceNumber: { fontSize: 22, fontWeight: '800', color: NAVY },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 },
  meta: { fontSize: 13, color: SLATE },
  metaStrong: { fontWeight: '700', color: '#334155' },
  metaDot: { fontSize: 13, color: SLATE, marginHorizontal: 6 },

  overduePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overdueText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },

  editBtn: {
    alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: NAVY, backgroundColor: '#fff',
  },
  editBtnText: { color: NAVY, fontWeight: '700', fontSize: 13 },

  actionsWrap: { marginTop: 14, gap: 10 },
  actionBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  actionPrimary: { backgroundColor: NAVY },
  actionPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: NAVY },
  actionSecondaryText: { color: NAVY, fontWeight: '700', fontSize: 14 },
  actionDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  actionDangerText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#cbd5e1', marginBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: NAVY },
  sheetSub: { fontSize: 13, color: SLATE, marginTop: 6, marginBottom: 12, lineHeight: 18 },
  reasonInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    backgroundColor: '#f9fafc', color: '#0f172a', minHeight: 90, textAlignVertical: 'top',
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  sheetCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff',
  },
  sheetCancelText: { color: SLATE, fontWeight: '700', fontSize: 14 },
  sheetConfirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#dc2626',
  },
  sheetConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  banner: {
    marginTop: 14,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  bannerTitle: { color: '#92400e', fontWeight: '700', fontSize: 14 },
  bannerBody: { color: '#92400e', fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 14,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manageLink: { fontSize: 12, fontWeight: '700', color: NAVY },

  partyRow: { flexDirection: 'row', gap: 12 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  partyName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  partySub: { fontSize: 12, color: SLATE, marginTop: 2, lineHeight: 17 },

  datesRow: { flexDirection: 'row', gap: 12 },
  datesRowDivider: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 14, paddingTop: 14 },
  dateLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.6 },
  dateValue: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 4 },

  itemRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemDesc: { fontSize: 14, color: '#1e293b', fontWeight: '600', flex: 1, paddingRight: 10 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemMeta: { fontSize: 12, color: SLATE, marginTop: 4 },

  totalsBlock: { marginTop: 12, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: SLATE },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
  negativeValue: { color: '#dc2626' },
  grandRow: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4, paddingTop: 10 },
  grandLabel: { fontSize: 15, fontWeight: '800', color: NAVY },
  grandValue: { fontSize: 15, fontWeight: '800', color: NAVY },

  aspLabel: { fontSize: 11, color: SLATE },
  aspValue: { fontSize: 12, color: '#0f172a', fontWeight: '600', marginTop: 2, marginBottom: 4 },

  notesText: { fontSize: 13, color: '#334155', lineHeight: 20 },

  emoji: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 16 },
  primaryBtn: {
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
