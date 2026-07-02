import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { useInvoiceGapReport } from '../../../src/hooks/useInvoices';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';
const GREEN = '#16a34a';
const RED = '#dc2626';

export default function GapReportScreen() {
  const params = useLocalSearchParams<{ companyId?: string }>();
  const { data: companies } = useCompanies();
  const [companyId, setCompanyId] = useState(params.companyId ?? '');

  useEffect(() => {
    if (!companyId && companies && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  const { data, isLoading, isError, refetch } = useInvoiceGapReport(companyId);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Sequence Gap Report' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>UAE Article 70 — invoice numbering audit</Text>

        {/* Company selector */}
        {companies && companies.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
            {companies.map((c) => {
              const active = c.id === companyId;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCompanyId(c.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        ) : isError || !data ? (
          <View style={styles.center}>
            <Feather name="alert-triangle" size={44} color={RED} style={{ marginBottom: 14 }} />
            <Text style={styles.errTitle}>Couldn't load the report</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Status banner */}
            <View
              style={[
                styles.banner,
                data.compliant ? styles.bannerOk : styles.bannerBad,
              ]}
            >
              <Feather
                name={data.compliant ? 'check-circle' : 'alert-circle'}
                size={22}
                color={data.compliant ? GREEN : RED}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: data.compliant ? GREEN : RED }]}>
                  {data.compliant ? 'Compliant — no gaps found' : `${data.gap_count} gap(s) found`}
                </Text>
                {data.message ? <Text style={styles.bannerMsg}>{data.message}</Text> : null}
              </View>
            </View>

            {/* Company info */}
            <View style={styles.card}>
              <Row label="Company" value={data.company} />
              <Row label="Company TRN" value={data.company_trn} />
              <Row label="Gaps detected" value={String(data.gap_count)} last />
            </View>

            {/* Gap list */}
            {data.gaps && data.gaps.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>MISSING SEQUENCE NUMBERS</Text>
                {data.gaps.map((gap, i) => (
                  <View key={i} style={styles.gapRow}>
                    <View style={styles.gapBadge}>
                      <Text style={styles.gapBadgeText}>#{gap.expected_sequence}</Text>
                    </View>
                    <Text style={styles.gapMeta}>
                      {gap.found_after ? `after ${gap.found_after}` : ''}
                      {gap.found_after && gap.found_before ? '  →  ' : ''}
                      {gap.found_before ? `before ${gap.found_before}` : ''}
                      {!gap.found_after && !gap.found_before ? 'Expected sequence missing' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },

  subtitle: { fontSize: 13, color: SLATE, marginBottom: 12 },

  chipsScroll: { flexGrow: 0, height: 46, marginBottom: 12 },
  chipsRow: { gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1,
  },
  bannerOk: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  bannerBad: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  bannerTitle: { fontSize: 15, fontWeight: '800' },
  bannerMsg: { fontSize: 13, color: SLATE, marginTop: 3, lineHeight: 18 },

  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 16 },
  rowLabel: { fontSize: 14, color: SLATE },
  rowValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1, textAlign: 'right' },

  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  gapBadge: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  gapBadgeText: { color: RED, fontWeight: '800', fontSize: 13 },
  gapMeta: { flex: 1, fontSize: 12, color: SLATE },

  errTitle: { fontSize: 17, fontWeight: '700', color: NAVY, marginBottom: 16 },
  primaryBtn: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
