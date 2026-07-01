import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useCompanies } from '../../src/hooks/useCompanies';
import { useInvoiceDashboard } from '../../src/hooks/useInvoices';
import { InvoiceStatusBadge } from '../../src/components/InvoiceStatusBadge';
import { LoadingScreen } from '../../src/components/Loading';
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const todayLabel = new Date().toLocaleDateString('en-AE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

type QuickAction = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  tint: string;
  bg: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Invoices', icon: 'file-text', route: '/invoices', tint: '#2563eb', bg: '#eff6ff' },
  { label: 'Customers', icon: 'users', route: '/customers', tint: '#0d9488', bg: '#f0fdfa' },
  { label: 'Companies', icon: 'briefcase', route: '/companies', tint: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Catalog', icon: 'package', route: '/invoices/products', tint: '#d97706', bg: '#fffbeb' },
];

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

  const totalInvoices = stats?.total_invoices ?? 0;
  const revenue = Number(stats?.total_revenue ?? 0);
  const avg = totalInvoices > 0 ? revenue / totalInvoices : 0;

  if (companiesLoading) {
    return <LoadingScreen label="Loading your dashboard…" />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />
      }
    >
      {/* Greeting */}
      <Text style={styles.greeting}>
        {greeting()}, {user?.first_name ?? 'there'}
      </Text>
      <Text style={styles.date}>{todayLabel}</Text>

      {/* No companies */}
      {!companies || companies.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="briefcase" size={26} color={NAVY} />
          </View>
          <Text style={styles.emptyTitle}>Set up your first company</Text>
          <Text style={styles.emptyText}>Add a company to start issuing invoices and see your stats here.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/companies/create' as any)}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Add Company</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Company selector */}
          {companies.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsRow}
            >
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

          {/* Hero revenue card */}
          <LinearGradient
            colors={['#1e3a5f', '#16314f', '#0c1d30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>TOTAL REVENUE</Text>
              <Feather name="trending-up" size={18} color="#93c5fd" />
            </View>
            <Text style={styles.heroValue}>
              <Text style={styles.heroCurrency}>AED </Text>
              {isLoading ? '—' : money(revenue)}
            </Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{isLoading ? '—' : totalInvoices}</Text>
                <Text style={styles.heroStatLabel}>Invoices</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{isLoading ? '—' : `AED ${money(stats?.total_vat)}`}</Text>
                <Text style={styles.heroStatLabel}>Total VAT</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{isLoading ? '—' : `AED ${money(avg)}`}</Text>
                <Text style={styles.heroStatLabel}>Avg / invoice</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Create invoice */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push({ pathname: '/invoices/create', params: { companyId } } as any)}
            activeOpacity={0.85}
          >
            <Feather name="plus-circle" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Create New Invoice</Text>
          </TouchableOpacity>

          {/* Status breakdown */}
          {breakdownEntries.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Invoice status</Text>
              <View style={styles.breakdownCard}>
                {breakdownEntries.map(([status, count], i) => {
                  const pct = totalInvoices > 0 ? Math.round((count / totalInvoices) * 100) : 0;
                  return (
                    <View
                      key={status}
                      style={[styles.breakdownRow, i > 0 && styles.breakdownRowDivider]}
                    >
                      <InvoiceStatusBadge status={status} />
                      <View style={styles.breakdownBarWrap}>
                        <View style={[styles.breakdownBar, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.breakdownCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Quick actions */}
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.route}
                style={styles.actionCard}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                  <Feather name={a.icon} size={20} color={a.tint} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
                <Feather name="chevron-right" size={16} color="#cbd5e1" style={styles.actionArrow} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingTop: 24, paddingBottom: 48 },

  greeting: { fontSize: 24, fontWeight: '800', color: NAVY, letterSpacing: -0.3 },
  date: { fontSize: 13, color: SLATE, marginTop: 4, marginBottom: 18, fontWeight: '500' },

  chipsScroll: { flexGrow: 0, marginBottom: 16 },
  chipsRow: { gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Hero
  hero: {
    borderRadius: 22, padding: 22, marginBottom: 14,
    shadowColor: '#1e3a5f', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#93c5fd', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -0.8, marginTop: 8 },
  heroCurrency: { fontSize: 18, fontWeight: '700', color: '#cbd5e1' },
  heroStatsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 16,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroStatValue: { color: '#fff', fontSize: 14, fontWeight: '800' },
  heroStatLabel: { color: '#94a3b8', fontSize: 10, marginTop: 3, fontWeight: '600' },

  // Create button
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 15, marginBottom: 6,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: NAVY, marginTop: 22, marginBottom: 12 },

  // Status breakdown
  breakdownCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 6,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10 },
  breakdownRowDivider: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  breakdownBarWrap: { flex: 1, height: 6, borderRadius: 999, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  breakdownBar: { height: 6, borderRadius: 999, backgroundColor: NAVY },
  breakdownCount: { fontSize: 15, fontWeight: '800', color: NAVY, minWidth: 24, textAlign: 'right' },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 16,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: NAVY },
  actionArrow: { position: 'absolute', top: 16, right: 14 },

  // Empty
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 26, alignItems: 'center', marginTop: 8,
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#eef2f8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: NAVY, marginBottom: 6 },
  emptyText: { fontSize: 14, color: SLATE, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: NAVY, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
