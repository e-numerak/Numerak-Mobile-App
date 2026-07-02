import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { useArSummary, useArAging, useArByCustomer } from '../../../src/hooks/useReports';
import { LoadingScreen, Shimmer } from '../../../src/components/Loading';
import type { ArAging, ArCustomerOutstanding } from '../../../src/types/reports.types';

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

// ── Animated count-up number ───────────────────────────────────────────────────
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
        <Feather name="loader" size={15} color={NAVY} />
      </Animated.View>
      <Text style={styles.refreshText}>Refreshing…</Text>
    </Animated.View>
  );
}

// ── Swipeable "outstanding by customer" row ─────────────────────────────────────
function CustomerRow({
  customer,
  companyId,
  divider,
  onOpen,
}: {
  customer: ArCustomerOutstanding;
  companyId: string;
  divider: boolean;
  onOpen: (customerId: string) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const hasId = !!customer.customer_id;

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
          {hasId && (
            <TouchableOpacity
              style={[styles.swipeBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                swipeRef.current?.close();
                onOpen(customer.customer_id!);
              }}
              activeOpacity={0.85}
            >
              <Feather name="user" size={16} color="#fff" />
              <Text style={styles.swipeBtnText}>Customer</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    );
  };

  const inner = (
    <TouchableOpacity
      activeOpacity={hasId ? 0.7 : 1}
      onPress={() => {
        if (!hasId) return;
        Haptics.selectionAsync().catch(() => {});
        onOpen(customer.customer_id!);
      }}
      style={[styles.custRow, divider && styles.custRowDivider]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.custName}>{customer.customer_name}</Text>
        <View style={styles.custMetaRow}>
          <Text style={styles.custMeta}>
            {customer.invoice_count} invoice{customer.invoice_count === 1 ? '' : 's'}
          </Text>
          {Number(customer.overdue) > 0 && (
            <>
              <Text style={styles.custDot}>·</Text>
              <Text style={[styles.custMeta, { color: RED }]}>
                Overdue AED {money(customer.overdue)}
              </Text>
            </>
          )}
        </View>
      </View>
      <AnimatedNumber
        value={Number(customer.outstanding ?? 0)}
        format={(n) => `AED ${money(n)}`}
        style={styles.custOutstanding}
      />
    </TouchableOpacity>
  );

  // Only wrap in a Swipeable when there's an action to reveal.
  if (!hasId) return inner;

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={() => Haptics.selectionAsync().catch(() => {})}
    >
      {inner}
    </Swipeable>
  );
}

// ── Aging bar with animated fill + count-up value ───────────────────────────────
function AgingRow({
  label,
  color,
  val,
  pct,
}: {
  label: string;
  color: string;
  val: number;
  pct: number;
}) {
  const target = Math.max(pct, val > 0 ? 6 : 0);
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: target,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [target]);

  const width = grow.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.agingRow}>
      <Text style={styles.agingLabel}>{label}</Text>
      <View style={styles.agingBarWrap}>
        <Animated.View style={[styles.agingBar, { width, backgroundColor: color }]} />
      </View>
      <AnimatedNumber value={val} format={money} style={styles.agingValue} />
    </View>
  );
}

export default function ReceivablesScreen() {
  const router = useRouter();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    summaryQ.refetch();
    agingQ.refetch();
    byCustQ.refetch();
  };

  const openCustomer = (customerId: string) => {
    router.push(`/companies/${companyId}/customers/${customerId}` as any);
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refetchAll}
          tintColor={NAVY}
          colors={[NAVY, AMBER]}
          progressBackgroundColor="#fff"
        />
      }
    >
      {/* Custom animated refresh indicator */}
      <RefreshSpinner visible={refreshing} />

      {/* Header */}
      <Text style={styles.title}>Accounts Receivable</Text>
      <Text style={styles.subtitle}>Outstanding invoices, aging and per-customer balances</Text>

      {/* Company selector */}
      {companies.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
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
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Summary cards */}
      {summaryQ.isLoading ? (
        <View style={styles.cardsGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <Shimmer width={30} height={30} radius={9} />
                <Shimmer width="55%" height={12} />
              </View>
              <Shimmer width="70%" height={22} style={{ marginTop: 4 }} />
              <Shimmer width="45%" height={11} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.cardsGrid}>
          <SummaryCard
            icon="credit-card" tint="#2563eb" bg="#eff6ff"
            label="Total Receivable"
            value={Number(s?.total_receivable ?? 0)}
            format={(n) => `AED ${money(n)}`}
            sub={`${s?.open_invoice_count ?? 0} open invoices`}
          />
          <SummaryCard
            icon="alert-triangle" tint={RED} bg="#fef2f2"
            label="Overdue"
            value={Number(s?.total_overdue ?? 0)}
            format={(n) => `AED ${money(n)}`}
            sub={`${s?.overdue_invoice_count ?? 0} overdue invoices`}
          />
          <SummaryCard
            icon="file-text" tint="#2563eb" bg="#eff6ff"
            label="Open Invoices"
            value={Number(s?.open_invoice_count ?? 0)}
            format={(n) => String(Math.round(n))}
          />
          <SummaryCard
            icon="clock" tint={AMBER} bg="#fffbeb"
            label="DSO (days)"
            value={Number(s?.dso_days ?? 0)}
            format={(n) => String(Math.round(n))}
            sub="Avg. days to collect"
          />
        </View>
      )}

      {/* Aging */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aging</Text>
        {agingQ.isLoading ? (
          <View style={{ marginTop: 6 }}>
            {AGING_BUCKETS.map((b) => (
              <View key={b.key} style={styles.agingRow}>
                <Shimmer width={52} height={12} />
                <View style={styles.agingBarWrap} />
                <Shimmer width={70} height={12} />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 6 }}>
            {AGING_BUCKETS.map((b) => {
              const val = Number(aging?.[b.key] ?? 0);
              const pct = Math.round((val / agingMax) * 100);
              return (
                <AgingRow key={b.key} label={b.label} color={b.color} val={val} pct={pct} />
              );
            })}
          </View>
        )}
      </View>

      {/* Outstanding by customer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Outstanding by Customer</Text>
        {byCustQ.isLoading ? (
          <View style={{ marginTop: 6, gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.custSkelRow}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Shimmer width="55%" height={14} />
                  <Shimmer width="38%" height={11} />
                </View>
                <Shimmer width={90} height={15} />
              </View>
            ))}
          </View>
        ) : customers.length === 0 ? (
          <Text style={styles.emptyRow}>No outstanding balances.</Text>
        ) : (
          <>
            {customers.map((c, i) => (
              <CustomerRow
                key={c.customer_id ?? i}
                customer={c}
                companyId={companyId}
                divider={i > 0}
                onOpen={openCustomer}
              />
            ))}
            <Text style={styles.swipeHint}>← Swipe a customer for quick actions</Text>
          </>
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
  format,
  sub,
}: {
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  bg: string;
  label: string;
  value: number;
  format: (n: number) => string;
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
      <AnimatedNumber value={value} format={format} style={styles.summaryValue} />
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

  chipsScroll: { flexGrow: 0, height: 46, marginBottom: 14 },
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
  custRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, gap: 12, backgroundColor: '#fff',
  },
  custRowDivider: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  custName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  custMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  custMeta: { fontSize: 12, color: SLATE },
  custDot: { fontSize: 12, color: MUTED },
  custOutstanding: { fontSize: 15, fontWeight: '800', color: NAVY },
  custSkelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyRow: { fontSize: 13, color: SLATE, paddingVertical: 12 },

  // Custom refresh indicator
  refreshBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, overflow: 'hidden',
  },
  refreshText: { fontSize: 12, fontWeight: '700', color: NAVY, letterSpacing: 0.2 },

  // Swipe actions
  swipeActions: { flexDirection: 'row', alignItems: 'center' },
  swipeBtn: {
    width: 78, alignItems: 'center', justifyContent: 'center', gap: 4,
    alignSelf: 'stretch',
  },
  swipeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  swipeHint: { fontSize: 11, color: MUTED, fontWeight: '600', textAlign: 'right', marginTop: 10 },
});
