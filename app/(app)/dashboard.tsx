import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useCompanies } from '../../src/hooks/useCompanies';
import { useInvoiceDashboard } from '../../src/hooks/useInvoices';
import { InvoiceStatusBadge } from '../../src/components/InvoiceStatusBadge';
import type { InvoiceStatus } from '../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';

function money(value: string | number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { data: companies, isLoading: companiesLoading } = useCompanies();

  const [companyId, setCompanyId] = useState('');
  useEffect(() => {
    if (!companyId && companies && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  const { data: stats, isLoading, refetch, isRefetching } = useInvoiceDashboard(companyId);

  const breakdown = stats?.status_breakdown ?? {};
  const breakdownEntries = Object.entries(breakdown).filter(([, v]) => (v ?? 0) > 0) as [
    InvoiceStatus,
    number
  ][];

  const cards = [
    { label: 'Total Invoices', value: String(stats?.total_invoices ?? 0), icon: '🧾', tint: '#2563eb', tintBg: '#eff6ff' },
    { label: 'Total Revenue', value: `AED ${money(stats?.total_revenue)}`, icon: '💰', tint: '#16a34a', tintBg: '#f0fdf4' },
    { label: 'Total VAT', value: `AED ${money(stats?.total_vat)}`, icon: '🧮', tint: '#d97706', tintBg: '#fffbeb' },
  ];

  const shortcuts = [
    { label: 'Companies', icon: '🏢', route: '/companies' as const },
    { label: 'Invoices', icon: '🧾', route: '/invoices' as const },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, {user?.first_name ?? 'there'}</Text>
        <Text style={styles.subGreeting}>Here's your business at a glance</Text>
      </View>

      {/* Company selector */}
      {companiesLoading ? (
        <ActivityIndicator color={NAVY} style={{ marginVertical: 20 }} />
      ) : !companies || companies.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏢</Text>
          <Text style={styles.emptyText}>Add a company to see your dashboard.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/companies/create' as any)}>
            <Text style={styles.emptyBtnText}>+ Add Company</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {companies.length > 1 && (
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

          {/* Stat cards */}
          {isLoading ? (
            <ActivityIndicator color={NAVY} style={{ marginVertical: 30 }} />
          ) : (
            <>
              <View style={styles.statsStack}>
                {cards.map((stat) => (
                  <View key={stat.label} style={styles.statCard}>
                    <View style={[styles.iconBadge, { backgroundColor: stat.tintBg }]}>
                      <Text style={styles.iconBadgeText}>{stat.icon}</Text>
                    </View>
                    <View style={styles.statTextWrap}>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                      <Text style={[styles.statValue, { color: stat.tint }]}>{stat.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Status breakdown */}
              {breakdownEntries.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Status breakdown</Text>
                  <View style={styles.breakdownCard}>
                    {breakdownEntries.map(([status, count]) => (
                      <View key={status} style={styles.breakdownRow}>
                        <InvoiceStatusBadge status={status} />
                        <Text style={styles.breakdownCount}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.shortcutsRow}>
        {shortcuts.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.shortcutCard}
            onPress={() => router.push(item.route)}
            activeOpacity={0.75}
          >
            <Text style={styles.shortcutIcon}>{item.icon}</Text>
            <Text style={styles.shortcutLabel}>{item.label}</Text>
            <Text style={styles.shortcutArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingTop: 28, paddingBottom: 48 },

  header: { marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: NAVY, letterSpacing: -0.3 },
  subGreeting: { fontSize: 14, color: SLATE, marginTop: 4 },

  chipsScroll: { flexGrow: 0, marginBottom: 16 },
  chipsRow: { gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  statsStack: { gap: 12, marginBottom: 24 },
  statCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  iconBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  iconBadgeText: { fontSize: 22 },
  statTextWrap: { flex: 1 },
  statLabel: { fontSize: 13, color: SLATE, marginBottom: 2, fontWeight: '500' },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 12, marginTop: 8 },

  breakdownCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 8, marginBottom: 24,
  },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 10,
  },
  breakdownCount: { fontSize: 16, fontWeight: '800', color: NAVY },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 24, alignItems: 'center', marginBottom: 24,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14, color: SLATE, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: NAVY, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  shortcutsRow: { flexDirection: 'row', gap: 12 },
  shortcutCard: { flex: 1, backgroundColor: NAVY, borderRadius: 16, padding: 18, minHeight: 110, justifyContent: 'space-between' },
  shortcutIcon: { fontSize: 26 },
  shortcutLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  shortcutArrow: { fontSize: 16, color: '#93c5fd', fontWeight: '700', alignSelf: 'flex-end' },
});
