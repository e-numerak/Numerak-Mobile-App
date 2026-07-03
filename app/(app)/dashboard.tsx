import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, Animated, Dimensions, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/store/authStore';
import { useCompanies } from '../../src/hooks/useCompanies';
import { useInvoiceDashboard, useInvoices } from '../../src/hooks/useInvoices';
import { InvoiceStatusBadge } from '../../src/components/InvoiceStatusBadge';
import { LoadingScreen, Shimmer } from '../../src/components/Loading';
import type { InvoiceStatus, InvoiceListItem } from '../../src/types/invoice.types';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const INK     = '#0a2540';
const GOLD    = '#f59e0b';
const SLATE   = '#64748b';
const MUTED   = '#94a3b8';
const BORDER  = '#e8edf3';
const BG      = '#f8f9fb';
const EMERALD = '#059669';

const { width: SW } = Dimensions.get('window');

// ── Helpers ───────────────────────────────────────────────────────────────────
function money(v: string | number | null | undefined) {
  return Number(v ?? 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const todayLabel = new Date().toLocaleDateString('en-AE', {
  weekday: 'long', day: 'numeric', month: 'long',
});

// ── Animated card wrapper (fade + slide-up on mount) ─────────────────────────
function FadeSlideCard({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 420, delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 420, delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ── Animated count-up number ───────────────────────────────────────────────────
// Smoothly tweens from the previous value to the next whenever `value` changes.
function AnimatedNumber({
  value,
  format,
  style,
  duration = 850,
}: {
  value: number;
  format: (n: number) => string;
  style?: any;
  duration?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const prev = useRef(0);
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    const from = prev.current;
    const to = value;
    anim.setValue(0);
    const id = anim.addListener(({ value: t }) => {
      setDisplay(format(from + (to - from) * t));
    });
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      prev.current = to;
      setDisplay(format(to));
    });
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

// ── Custom animated refresh indicator ───────────────────────────────────────────
function RefreshSpinner({ visible }: { visible: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const maxH = height.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });

  return (
    <Animated.View style={[styles.refreshBar, { height: maxH, opacity: height }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Feather name="loader" size={15} color={INK} />
      </Animated.View>
      <Text style={styles.refreshText}>Refreshing…</Text>
    </Animated.View>
  );
}

// ── Swipeable recent-invoice row ────────────────────────────────────────────────
function InvoiceRow({
  invoice,
  onOpen,
  currency,
}: {
  invoice: InvoiceListItem;
  onOpen: () => void;
  currency: string;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const copyNumber = async () => {
    await Clipboard.setStringAsync(invoice.invoice_number);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    swipeRef.current?.close();
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-140, -70, 0],
      outputRange: [1, 0.9, 0.6],
      extrapolate: 'clamp',
    });
    return (
      <View style={styles.swipeActions}>
        <Animated.View style={{ transform: [{ scale }], flexDirection: 'row' }}>
          <TouchableOpacity
            style={[styles.swipeBtn, { backgroundColor: '#2563eb' }]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              swipeRef.current?.close();
              onOpen();
            }}
            activeOpacity={0.85}
          >
            <Feather name="eye" size={16} color="#fff" />
            <Text style={styles.swipeBtnText}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeBtn, { backgroundColor: INK }]}
            onPress={copyNumber}
            activeOpacity={0.85}
          >
            <Feather name="copy" size={16} color="#fff" />
            <Text style={styles.swipeBtnText}>Copy #</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={() => Haptics.selectionAsync().catch(() => {})}
    >
      <TouchableOpacity
        style={styles.invRow}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onOpen();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.invLeft}>
          <Text style={styles.invNumber} numberOfLines={1}>{invoice.invoice_number}</Text>
          <Text style={styles.invCustomer} numberOfLines={1}>
            {invoice.customer_name || '—'}
          </Text>
        </View>
        <View style={styles.invRight}>
          <Text style={styles.invAmount}>
            {currency} {money(invoice.total_amount)}
          </Text>
          <InvoiceStatusBadge status={invoice.status} />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────
type QA = { label: string; icon: keyof typeof Feather.glyphMap; route: string; tint: string; bg: string };

const QUICK_ACTIONS: QA[] = [
  { label: 'Invoices',   icon: 'file-text',   route: '/invoices',           tint: '#2563eb', bg: '#eff6ff' },
  { label: 'Customers',  icon: 'users',        route: '/customers',          tint: EMERALD,   bg: '#f0fdf4' },
  { label: 'Companies',  icon: 'briefcase',    route: '/companies',          tint: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Catalog',    icon: 'package',      route: '/invoices/products',  tint: GOLD,      bg: '#fffbeb' },
];

// ── Screen ────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user }   = useAuthStore();
  const router     = useRouter();

  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    if (!companyId && companies && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  const { data: stats, isLoading: statsLoading, refetch, isRefetching } =
    useInvoiceDashboard(companyId);

  // Fetch a large page so we can both list the recent 5 AND compute the
  // headline totals from real invoices (the backend's total_revenue only
  // counts realized/paid invoices, so pending invoices would read as 0).
  const { data: recent, isLoading: recentLoading, refetch: refetchRecent } =
    useInvoices({ company_id: companyId, page_size: 200 });
  const allInvoices = recent?.results ?? [];
  const recentInvoices = allInvoices.slice(0, 5);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    refetch();
    refetchRecent();
  };

  const breakdown = stats?.status_breakdown ?? {};
  const breakdownEntries = Object.entries(breakdown).filter(
    ([, v]) => (v ?? 0) > 0
  ) as [InvoiceStatus, number][];

  // Invoiced revenue = sum of every active (non-void) invoice's total.
  const VOID_STATUSES: InvoiceStatus[] = ['cancelled', 'deactivated', 'rejected'];
  const activeInvoices = allInvoices.filter((i) => !VOID_STATUSES.includes(i.status));
  const computedRevenue = activeInvoices.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
  const computedVat = activeInvoices.reduce((s, i) => s + Number(i.total_vat ?? 0), 0);

  // Prefer the computed figure; fall back to the backend value if we have no
  // invoices loaded yet (e.g. list still fetching).
  const backendRevenue = Number(stats?.total_revenue ?? 0);
  const backendVat = Number(stats?.total_vat ?? 0);
  const revenue = computedRevenue > 0 ? computedRevenue : backendRevenue;
  const totalVat = computedVat > 0 ? computedVat : backendVat;

  const totalInvoices = stats?.total_invoices ?? recent?.pagination?.count ?? allInvoices.length;
  const revenueCount = activeInvoices.length || totalInvoices;
  const avg = revenueCount > 0 ? revenue / revenueCount : 0;

  // The hero waits on both the stats and the invoice list.
  const heroLoading = statsLoading || recentLoading;

  if (companiesLoading) return <LoadingScreen label="Loading dashboard…" />;

  const hasCompanies = companies && companies.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={INK}
          colors={[INK, GOLD]}
          progressBackgroundColor="#fff"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Custom animated refresh indicator ── */}
      <RefreshSpinner visible={isRefetching} />

      {/* ── Greeting ── */}
      <FadeSlideCard delay={0}>
        <Text style={styles.greeting}>{greeting()},</Text>
        <Text style={styles.greetingName}>{user?.first_name ?? 'there'}</Text>
        <Text style={styles.date}>{todayLabel}</Text>
      </FadeSlideCard>

      {!hasCompanies ? (
        /* ── Empty state ── */
        <FadeSlideCard delay={120}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Feather name="briefcase" size={28} color={INK} />
            </View>
            <Text style={styles.emptyTitle}>Set up your first company</Text>
            <Text style={styles.emptyBody}>
              Add a company to start issuing PEPPOL invoices and see your stats here.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/companies/create' as any)}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={15} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Company</Text>
            </TouchableOpacity>
          </View>
        </FadeSlideCard>
      ) : (
        <>
          {/* ── Company selector (multi-company) ── */}
          {companies.length > 1 && (
            <FadeSlideCard delay={80}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
              >
                {companies.map((c) => {
                  const active = c.id === companyId;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setCompanyId(c.id);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </FadeSlideCard>
          )}

          {/* ── Hero revenue card ── */}
          <FadeSlideCard delay={160}>
            <LinearGradient
              colors={['#0a2540', '#0d3260', '#071828']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              {/* Gold shimmer top border */}
              <View style={styles.heroGoldBorder} />

              <View style={styles.heroTopRow}>
                <Text style={styles.heroEyebrow}>TOTAL REVENUE</Text>
                <View style={styles.heroTrendPill}>
                  <Feather name="trending-up" size={12} color={GOLD} />
                  <Text style={styles.heroTrendText}>This period</Text>
                </View>
              </View>

              {heroLoading ? (
                <Shimmer
                  width="70%"
                  height={38}
                  radius={10}
                  base="rgba(255,255,255,0.12)"
                  highlight="rgba(255,255,255,0.28)"
                  style={{ marginTop: 4 }}
                />
              ) : (
                <Text style={styles.heroValue}>
                  <Text style={styles.heroCurrency}>AED </Text>
                  <AnimatedNumber value={revenue} format={money} style={styles.heroValue} />
                </Text>
              )}

              <View style={styles.heroRule} />

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  {heroLoading ? (
                    <Shimmer width={40} height={14} base="rgba(255,255,255,0.12)" highlight="rgba(255,255,255,0.28)" style={{ marginBottom: 6 }} />
                  ) : (
                    <AnimatedNumber
                      value={totalInvoices}
                      format={(n) => String(Math.round(n))}
                      style={styles.heroStatVal}
                    />
                  )}
                  <Text style={styles.heroStatLabel}>Invoices</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  {heroLoading ? (
                    <Shimmer width={64} height={14} base="rgba(255,255,255,0.12)" highlight="rgba(255,255,255,0.28)" style={{ marginBottom: 6 }} />
                  ) : (
                    <AnimatedNumber
                      value={totalVat}
                      format={(n) => `AED ${money(n)}`}
                      style={styles.heroStatVal}
                    />
                  )}
                  <Text style={styles.heroStatLabel}>Total VAT</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  {heroLoading ? (
                    <Shimmer width={64} height={14} base="rgba(255,255,255,0.12)" highlight="rgba(255,255,255,0.28)" style={{ marginBottom: 6 }} />
                  ) : (
                    <AnimatedNumber
                      value={avg}
                      format={(n) => `AED ${money(n)}`}
                      style={styles.heroStatVal}
                    />
                  )}
                  <Text style={styles.heroStatLabel}>Avg / invoice</Text>
                </View>
              </View>
            </LinearGradient>
          </FadeSlideCard>

          {/* ── Create invoice CTA ── */}
          <FadeSlideCard delay={220}>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                router.push({ pathname: '/invoices/new', params: { companyId } } as any);
              }}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[GOLD, '#d97706']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.createBtnGradient}
              >
                <Feather name="plus-circle" size={17} color="#fff" />
                <Text style={styles.createBtnText}>Create New Invoice</Text>
                <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
              </LinearGradient>
            </TouchableOpacity>
          </FadeSlideCard>

          {/* ── Recent invoices (swipeable) ── */}
          <FadeSlideCard delay={260}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent invoices</Text>
              {recentInvoices.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    router.push('/invoices' as any);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.recentCard}>
              {recentLoading ? (
                <View style={{ padding: 14, gap: 14 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={styles.recentSkelRow}>
                      <View style={{ flex: 1, gap: 8 }}>
                        <Shimmer width="55%" height={14} />
                        <Shimmer width="38%" height={11} />
                      </View>
                      <Shimmer width={70} height={20} radius={999} />
                    </View>
                  ))}
                </View>
              ) : recentInvoices.length === 0 ? (
                <View style={styles.recentEmpty}>
                  <Feather name="inbox" size={22} color={MUTED} />
                  <Text style={styles.recentEmptyText}>No invoices yet</Text>
                </View>
              ) : (
                recentInvoices.map((inv, i) => (
                  <View key={inv.id} style={i > 0 ? styles.invRowDivider : undefined}>
                    <InvoiceRow
                      invoice={inv}
                      currency={inv.currency}
                      onOpen={() => router.push(`/invoices/${inv.id}` as any)}
                    />
                  </View>
                ))
              )}
            </View>
            {recentInvoices.length > 0 && (
              <Text style={styles.swipeHint}>← Swipe a row for quick actions</Text>
            )}
          </FadeSlideCard>

          {/* ── Status breakdown ── */}
          {breakdownEntries.length > 0 && (
            <FadeSlideCard delay={300}>
              <Text style={styles.sectionTitle}>Invoice status</Text>
              <View style={styles.breakdownCard}>
                {breakdownEntries.map(([status, count], i) => {
                  const pct = totalInvoices > 0
                    ? Math.round((count / totalInvoices) * 100)
                    : 0;
                  return (
                    <View
                      key={status}
                      style={[
                        styles.breakdownRow,
                        i > 0 && styles.breakdownRowDivider,
                      ]}
                    >
                      <InvoiceStatusBadge status={status} />
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.breakdownCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </FadeSlideCard>
          )}

          {/* ── Quick actions ── */}
          <FadeSlideCard delay={380}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((a) => (
                <TouchableOpacity
                  key={a.route}
                  style={styles.actionCard}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    router.push(a.route as any);
                  }}
                  activeOpacity={0.72}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: a.bg }]}>
                    <Feather name={a.icon} size={20} color={a.tint} />
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                  <Feather
                    name="chevron-right"
                    size={15}
                    color={MUTED}
                    style={styles.actionChevron}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </FadeSlideCard>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingTop: 26, paddingBottom: 52 },

  // Greeting
  greeting:     { fontSize: 15, fontWeight: '600', color: MUTED },
  greetingName: { fontSize: 28, fontWeight: '900', color: INK, letterSpacing: -0.5, marginTop: 2 },
  date:         { fontSize: 13, color: MUTED, fontWeight: '500', marginTop: 5, marginBottom: 22 },

  // Company chips
  chipScroll: { flexGrow: 0, marginBottom: 16 },
  chipRow:    { gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  chipActive:     { backgroundColor: INK, borderColor: INK },
  chipText:       { fontSize: 13, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Hero card
  hero: {
    borderRadius: 22, padding: 22, marginBottom: 14, overflow: 'hidden',
    shadowColor: INK, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  heroGoldBorder: {
    position: 'absolute', top: 0, left: 28, right: 28, height: 2,
    backgroundColor: GOLD, borderRadius: 1, opacity: 0.7,
  },
  heroTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  heroEyebrow: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  heroTrendPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.14)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  heroTrendText:  { color: GOLD, fontSize: 10, fontWeight: '700' },
  heroValue:      { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  heroCurrency:   { fontSize: 18, fontWeight: '700', color: '#64748b' },
  heroRule: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  heroStats:      { flexDirection: 'row', alignItems: 'center' },
  heroStat:       { flex: 1, alignItems: 'center' },
  heroDivider:    { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroStatVal:    { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  heroStatLabel:  { color: MUTED, fontSize: 10, fontWeight: '600' },

  // Create button
  createBtn:          { borderRadius: 16, marginBottom: 6, overflow: 'hidden' },
  createBtnGradient:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 15,
  },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Custom refresh indicator
  refreshBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, overflow: 'hidden',
  },
  refreshText: { fontSize: 12, fontWeight: '700', color: INK, letterSpacing: 0.2 },

  // Section title
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: INK,
    letterSpacing: 0.3, marginTop: 22, marginBottom: 12,
    textTransform: 'uppercase',
  },

  // Recent invoices
  recentHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  viewAll: { fontSize: 12, fontWeight: '700', color: GOLD, marginTop: 22, marginBottom: 12 },
  recentCard: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  recentSkelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentEmpty: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  recentEmptyText: { fontSize: 13, color: MUTED, fontWeight: '600' },
  invRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#fff',
  },
  invRowDivider: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  invLeft: { flex: 1 },
  invNumber: { fontSize: 14, fontWeight: '800', color: INK },
  invCustomer: { fontSize: 12, color: SLATE, marginTop: 3, fontWeight: '500' },
  invRight: { alignItems: 'flex-end', gap: 6 },
  invAmount: { fontSize: 14, fontWeight: '800', color: INK },
  swipeActions: { flexDirection: 'row', alignItems: 'center' },
  swipeBtn: {
    width: 68, alignItems: 'center', justifyContent: 'center', gap: 4,
    alignSelf: 'stretch',
  },
  swipeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  swipeHint: { fontSize: 11, color: MUTED, fontWeight: '600', textAlign: 'right', marginTop: 8 },

  // Breakdown
  breakdownCard: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, paddingVertical: 4,
  },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  breakdownRowDivider: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  barTrack: {
    flex: 1, height: 5, borderRadius: 999,
    backgroundColor: '#f1f5f9', overflow: 'hidden',
  },
  barFill:        { height: 5, borderRadius: 999, backgroundColor: INK },
  breakdownCount: {
    fontSize: 14, fontWeight: '800', color: INK,
    minWidth: 22, textAlign: 'right',
  },

  // Quick actions grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: (SW - 48) / 2, backgroundColor: '#fff',
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 16, position: 'relative',
  },
  actionIconBox: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  actionLabel:   { fontSize: 14, fontWeight: '700', color: INK },
  actionChevron: { position: 'absolute', top: 16, right: 14 },

  // Empty state
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    padding: 28, alignItems: 'center', marginTop: 12,
  },
  emptyIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#eef2f8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 8 },
  emptyBody:  {
    fontSize: 14, color: SLATE, textAlign: 'center',
    marginBottom: 20, lineHeight: 21,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: INK, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});