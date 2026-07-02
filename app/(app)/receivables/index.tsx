import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { useArSummary, useArAging, useArByCustomer } from '../../../src/hooks/useReports';
import { LoadingScreen } from '../../../src/components/Loading';
import type { ArAging } from '../../../src/types/reports.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const MUTED = '#94a3b8';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';
const GREEN = '#16a34a';
const AMBER = '#d97706';
const RED = '#dc2626';

function money(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const AGING_BUCKETS: { key: keyof ArAging; label: string; color: string }[] = [
  { key: 'current', label: 'Current', color: GREEN },
  { key: 'd1_15', label: '1–15', color: AMBER },
  { key: 'd16_30', label: '16–30', color: AMBER },
  { key: 'd31_45', label: '31–45', color: '#ea580c' },
  { key: 'd46_60', label: '46–60', color: RED },
  { key: 'd60_plus', label: '60+', color: RED },
];

export default function ReceivablesScreen() {
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const [companyId, setCompanyId] = useState('');
  useEffect(() => {
    if (!companyId && companies && companies.length > 0) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  const summaryQ = useArSummary(companyId);
  const agingQ = useArAging(companyId);
  const byCustQ = useArByCustomer(companyId);

  const refreshing = summaryQ.isRefetching || agingQ.isRefetching || byCustQ.isRefetching;
  const refetchAll = () => {
    summaryQ.refetch();
    agingQ.refetch();
    byCustQ.refetch();
  };

  if (companiesLoading) {
    return <LoadingScreen label="Loading receivables…" />;
  }

  if (!companies || companies.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="credit-card" size={44} color={MUTED} style={{ marginBottom: 12 }} />
        <Text style={styles.emptyText}>Add a company to view its receivables.</Text>
      </View>
    );
  }

  const s = summaryQ.data;
  const aging = agingQ.data;
  const customers = byCustQ.data ?? [];

  const agingValues = aging ? AGING_BUCKETS.map((b) => Number(aging[b.key] ?? 0)) : [];
  const agingMax = Math.max(1, ...agingValues);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={NAVY} />}
    >
      {/* Header */}
      <Text style={styles.title}>Accounts Receivable</Text>
      <Text style={styles.subtitle}>Outstanding invoices, aging and per-customer balances</Text>

      {/* Company selector */}
      {companies.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
          {companies.map((c) => {
            const active = c.id === companyId;
            return (
              <TouchableOpacity key={c.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setCompanyId(c.id)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Summary cards */}
      {summaryQ.isLoading ? (
        <ActivityIndicator color={NAVY} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.cardsGrid}>
          <SummaryCard
            icon="credit-card" tint="#2563eb" bg="#eff6ff"
            label="Total Receivable"
            value={`AED ${money(s?.total_receivable)}`}
            sub={`${s?.open_invoice_count ?? 0} open invoices`}
          />
          <SummaryCard
            icon="alert-triangle" tint={RED} bg="#fef2f2"
            label="Overdue"
            value={`AED ${money(s?.total_overdue)}`}
            sub={`${s?.overdue_invoice_count ?? 0} overdue invoices`}
          />
          <SummaryCard
            icon="file-text" tint="#2563eb" bg="#eff6ff"
            label="Open Invoices"
            value={String(s?.open_invoice_count ?? 0)}
          />
          <SummaryCard
            icon="clock" tint={AMBER} bg="#fffbeb"
            label="DSO (days)"
            value={String(s?.dso_days ?? 0)}
            sub="Avg. days to collect"
          />
        </View>
      )}

      {/* Aging */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aging</Text>
        {agingQ.isLoading ? (
          <ActivityIndicator color={NAVY} style={{ marginVertical: 16 }} />
        ) : (
          <View style={{ marginTop: 6 }}>
            {AGING_BUCKETS.map((b) => {
              const val = Number(aging?.[b.key] ?? 0);
              const pct = Math.round((val / agingMax) * 100);
              return (
                <View key={b.key} style={styles.agingRow}>
                  <Text style={styles.agingLabel}>{b.label}</Text>
                  <View style={styles.agingBarWrap}>
                    <View style={[styles.agingBar, { width: `${Math.max(pct, val > 0 ? 6 : 0)}%`, backgroundColor: b.color }]} />
                  </View>
                  <Text style={styles.agingValue}>{money(val)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Outstanding by customer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Outstanding by Customer</Text>
        {byCustQ.isLoading ? (
          <ActivityIndicator color={NAVY} style={{ marginVertical: 16 }} />
        ) : customers.length === 0 ? (
          <Text style={styles.emptyRow}>No outstanding balances.</Text>
        ) : (
          customers.map((c, i) => (
            <View key={c.customer_id ?? i} style={[styles.custRow, i > 0 && styles.custRowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName}>{c.customer_name}</Text>
                <View style={styles.custMetaRow}>
                  <Text style={styles.custMeta}>{c.invoice_count} invoice{c.invoice_count === 1 ? '' : 's'}</Text>
                  {Number(c.overdue) > 0 && (
                    <>
                      <Text style={styles.custDot}>·</Text>
                      <Text style={[styles.custMeta, { color: RED }]}>Overdue AED {money(c.overdue)}</Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={styles.custOutstanding}>AED {money(c.outstanding)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function SummaryCard({
  icon,
  tint,
  bg,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  bg: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={[styles.summaryIcon, { backgroundColor: bg }]}>
          <Feather name={icon} size={16} color={tint} />
        </View>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      {sub ? <Text style={styles.summarySub}>{sub}</Text> : <View style={{ height: 14 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingTop: 22, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },
  emptyText: { fontSize: 14, color: SLATE, textAlign: 'center' },

  title: { fontSize: 24, fontWeight: '800', color: NAVY, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: SLATE, marginTop: 4, marginBottom: 16 },

  chipsScroll: { flexGrow: 0, marginBottom: 14 },
  chipsRow: { gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Summary grid
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 6 },
  summaryCard: {
    width: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 16,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  summaryIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 12, color: SLATE, fontWeight: '600', flex: 1 },
  summaryValue: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  summarySub: { fontSize: 11, color: MUTED, marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginTop: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: NAVY, marginBottom: 6 },

  // Aging
  agingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  agingLabel: { width: 52, fontSize: 12, color: '#334155', fontWeight: '700' },
  agingBarWrap: { flex: 1, height: 10, borderRadius: 999, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  agingBar: { height: 10, borderRadius: 999 },
  agingValue: { width: 78, textAlign: 'right', fontSize: 12, color: SLATE, fontWeight: '600' },

  // By customer
  custRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  custRowDivider: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  custName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  custMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  custMeta: { fontSize: 12, color: SLATE },
  custDot: { fontSize: 12, color: MUTED },
  custOutstanding: { fontSize: 15, fontWeight: '800', color: NAVY },
  emptyRow: { fontSize: 13, color: SLATE, paddingVertical: 12 },
});
