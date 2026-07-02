import { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { Shimmer } from '../../../src/components/Loading';
import { AnimatedNumber, RefreshSpinner } from '../../../src/components/AnimatedUI';
import type { Company } from '../../../src/types/company.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';

export default function CompaniesScreen() {
  const router = useRouter();
  const { data: companies, isLoading, isError, error, refetch, isRefetching } =
    useCompanies();

  // ── Loading state (shimmer skeletons) ──────
  if (isLoading) {
    return (
      <View style={[styles.screen, styles.listContent]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <Shimmer width={44} height={44} radius={12} />
              <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                <Shimmer width="55%" height={16} />
                <Shimmer width="35%" height={12} />
              </View>
            </View>
            <View style={[styles.cardFooter, { borderTopColor: '#f1f5f9' }]}>
              <Shimmer width="40%" height={12} />
              <Shimmer width="25%" height={12} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // ── Error state ─────────────────────────────
  if (isError) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Couldn't load companies</Text>
        <Text style={styles.errorMessage}>
          {(error as any)?.response?.data?.detail ?? 'Something went wrong. Please try again.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty state ──────────────────────────────
  if (!companies || companies.length === 0) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorIcon}>🏢</Text>
        <Text style={styles.errorTitle}>No companies yet</Text>
        <Text style={styles.errorMessage}>
          Add your first company to start issuing PEPPOL invoices.
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/companies/create' as any)}
        >
          <Text style={styles.addButtonText}>+ Add Company</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── List state ───────────────────────────────
  const totalMembers = companies.reduce((sum, c) => sum + (c.member_count ?? 0), 0);
  const activeCount = companies.filter((c) => c.is_active).length;

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    refetch();
  };

  return (
    <View style={styles.screen}>
      {/* Custom animated refresh indicator */}
      <RefreshSpinner visible={isRefetching} color={NAVY} />

      {/* Animated metrics strip */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricItem}>
          <Feather name="briefcase" size={14} color={SLATE} />
          <AnimatedNumber
            value={companies.length}
            format={(n) => `${Math.round(n)} compan${Math.round(n) === 1 ? 'y' : 'ies'}`}
            style={styles.metricText}
          />
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Feather name="check-circle" size={14} color={SLATE} />
          <AnimatedNumber value={activeCount} format={(n) => `${Math.round(n)} active`} style={styles.metricText} />
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Feather name="users" size={14} color={SLATE} />
          <AnimatedNumber value={totalMembers} format={(n) => `${Math.round(n)} members`} style={styles.metricTextStrong} />
        </View>
      </View>

      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={NAVY} colors={[NAVY]} progressBackgroundColor="#fff" />
        }
        renderItem={({ item }) => <CompanyCard company={item} router={router} />}
      />

      {/* Floating Add button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/companies/create' as any);
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ───────────────────────────────────────────
// Company Card
// ───────────────────────────────────────────
function CompanyCard({ company, router }: { company: Company; router: ReturnType<typeof useRouter> }) {
  const swipeRef = useRef<Swipeable>(null);

  const go = (path: string) => {
    Haptics.selectionAsync().catch(() => {});
    swipeRef.current?.close();
    router.push(path as any);
  };

  const renderRightActions = (
    _p: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-150, -75, 0],
      outputRange: [1, 0.9, 0.6],
      extrapolate: 'clamp',
    });
    return (
      <View style={styles.swipeActions}>
        <Animated.View style={{ transform: [{ scale }], flexDirection: 'row' }}>
          <TouchableOpacity
            style={[styles.swipeBtn, { backgroundColor: '#0d9488' }]}
            onPress={() => go(`/companies/${company.id}/customers`)}
            activeOpacity={0.85}
          >
            <Feather name="users" size={16} color="#fff" />
            <Text style={styles.swipeBtnText}>Customers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeBtn, { backgroundColor: NAVY }]}
            onPress={() => go(`/invoices?companyId=${company.id}`)}
            activeOpacity={0.85}
          >
            <Feather name="file-text" size={16} color="#fff" />
            <Text style={styles.swipeBtnText}>Invoices</Text>
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
      containerStyle={styles.swipeContainer}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          router.push(`/companies/${company.id}` as any);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{company.name?.[0]?.toUpperCase() ?? 'C'}</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyTrn}>TRN: {company.trn}</Text>
          </View>
          {!company.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>📍 {company.city}, {company.emirate?.replace('_', ' ')}</Text>
          <Text style={styles.cardFooterText}>👥 {company.member_count} member{company.member_count === 1 ? '' : 's'}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
    padding: 24,
  },

  listContent: { padding: 16, paddingBottom: 100 },

  // Animated metrics strip
  metricsStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  metricDivider: { width: 1, height: 20, backgroundColor: '#eef2f7' },
  metricText: { fontSize: 12, color: SLATE, fontWeight: '600' },
  metricTextStrong: { fontSize: 12.5, color: NAVY, fontWeight: '800' },

  // Swipe
  swipeContainer: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: {
    width: 82, alignItems: 'center', justifyContent: 'center', gap: 4, alignSelf: 'stretch',
  },
  swipeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardHeaderText: { flex: 1 },
  companyName: { fontSize: 16, fontWeight: '700', color: NAVY },
  companyTrn: { fontSize: 12, color: SLATE, marginTop: 2 },
  inactiveBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', color: '#dc2626' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cardFooterText: { fontSize: 12, color: SLATE },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '400', marginTop: -2 },

  // Error / Empty states
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: SLATE, textAlign: 'center', marginBottom: 20 },
  retryButton: {
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  addButton: {
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});