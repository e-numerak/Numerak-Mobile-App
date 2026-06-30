import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useInvoiceVatSummary } from '../../../../src/hooks/useInvoices';
import type { VatRateType } from '../../../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';

const VAT_LABELS: Record<VatRateType, string> = {
  standard: 'Standard',
  zero: 'Zero-rated',
  exempt: 'Exempt',
  out_of_scope: 'Out of Scope',
};

function money(value: string | number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function VatSummaryScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useInvoiceVatSummary(invoiceId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'VAT Summary' }} />
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'VAT Summary' }} />
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.errTitle}>Couldn't load VAT summary</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cur = data.currency;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'VAT Summary' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>{data.invoice_number}</Text>

        {/* Breakdown by rate type */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>BREAKDOWN BY VAT RATE</Text>

          <View style={styles.headerRow}>
            <Text style={[styles.hCell, { flex: 1.6 }]}>Rate Type</Text>
            <Text style={[styles.hCell, styles.right]}>Taxable</Text>
            <Text style={[styles.hCell, styles.right]}>VAT</Text>
          </View>

          {data.vat_breakdown.length === 0 ? (
            <Text style={styles.muted}>No VAT breakdown available.</Text>
          ) : (
            data.vat_breakdown.map((row, i) => (
              <View key={`${row.vat_rate_type}-${i}`} style={styles.dataRow}>
                <View style={{ flex: 1.6 }}>
                  <Text style={styles.rateType}>
                    {VAT_LABELS[row.vat_rate_type] ?? row.vat_rate_type}
                  </Text>
                  <Text style={styles.ratePct}>{Number(row.vat_rate)}%</Text>
                </View>
                <Text style={[styles.dCell, styles.right]}>{money(row.taxable_amount)}</Text>
                <Text style={[styles.dCell, styles.right]}>{money(row.vat_amount)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TOTALS</Text>
          <TotalRow label="Subtotal" value={`${cur} ${money(data.subtotal)}`} />
          {Number(data.discount) > 0 && (
            <TotalRow label="Discount" value={`− ${cur} ${money(data.discount)}`} negative />
          )}
          <TotalRow label="Taxable Amount" value={`${cur} ${money(data.taxable_amount)}`} />
          <TotalRow label="Total VAT" value={`${cur} ${money(data.total_vat)}`} />
          <TotalRow label="Total Amount" value={`${cur} ${money(data.total_amount)}`} grand />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
      <Text style={[styles.totalValue, grand && styles.grandValue, negative && styles.negative]}>
        {value}
      </Text>
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
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 12 },

  headerRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  hCell: { flex: 1, fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.4 },
  right: { textAlign: 'right' },

  dataRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  rateType: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  ratePct: { fontSize: 12, color: SLATE, marginTop: 2 },
  dCell: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '600' },
  muted: { fontSize: 13, color: SLATE, paddingVertical: 12 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 13, color: SLATE },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
  negative: { color: '#dc2626' },
  grandRow: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 6, paddingTop: 10 },
  grandLabel: { fontSize: 16, fontWeight: '800', color: NAVY },
  grandValue: { fontSize: 16, fontWeight: '800', color: NAVY },

  emoji: { fontSize: 44, marginBottom: 12 },
  errTitle: { fontSize: 17, fontWeight: '700', color: NAVY, marginBottom: 16 },
  primaryBtn: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
