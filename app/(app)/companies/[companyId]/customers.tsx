import { useState, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useCustomers } from '../../../../src/hooks/useCustomers';
import { Shimmer } from '../../../../src/components/Loading';
import { AnimatedNumber, RefreshSpinner } from '../../../../src/components/AnimatedUI';
import type { Customer } from '../../../../src/types/customer.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const MUTED = '#94a3b8';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';
const GREEN = '#16a34a';
const AMBER = '#d97706';
const ERROR = '#dc2626';
const ACCENT = '#2f6fed';       // lighter, trustworthy blue (avatar / FAB)
const ACCENT_SOFT = '#eaf1fd';  // tint background for accent icons

export default function CompanyCustomersScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [search, setSearch] = useState('');

  // Set the header title imperatively — reliable even when the route name
  // would otherwise leak into the header (customers.tsx + customers/ folder).
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Customers' });
  }, [navigation]);

  const { data, isLoading, isError, refetch, isRefetching } = useCustomers({
    company_id: companyId,
    search: search.trim() || undefined,
  });

  const customers = data?.results ?? [];
  const completeCount = customers.filter((c) => c.is_complete).length;

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    refetch();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Customers' }} />
      <View style={styles.screen}>
        {/* Search bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color={MUTED} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, TRN, or email"
              placeholderTextColor={MUTED}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={17} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Custom animated refresh indicator */}
        <RefreshSpinner visible={isRefetching} color={NAVY} />

        {/* Animated status indicators */}
        {!isLoading && !isError && customers.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <View style={[styles.statIcon, { backgroundColor: ACCENT_SOFT }]}>
                <Feather name="users" size={15} color={ACCENT} />
              </View>
              <View>
                <AnimatedNumber
                  value={customers.length}
                  format={(n) => String(Math.round(n))}
                  style={styles.statValue}
                />
                <Text style={styles.statLabel}>Customer{customers.length === 1 ? '' : 's'}</Text>
              </View>
            </View>

            <View style={styles.statPill}>
              <View style={[styles.statIcon, { backgroundColor: '#e8f7ef' }]}>
                <Feather name="check-circle" size={15} color={GREEN} />
              </View>
              <View>
                <AnimatedNumber
                  value={completeCount}
                  format={(n) => String(Math.round(n))}
                  style={styles.statValue}
                />
                <Text style={styles.statLabel}>Complete</Text>
              </View>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.listContent}>
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
                  <Shimmer width="45%" height={12} />
                  <Shimmer width="20%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : isError ? (
          <View style={styles.centerScreen}>
            <Text style={styles.errorTitle}>Couldn't load customers</Text>
            <Text style={styles.errorMessage}>Please check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : customers.length === 0 ? (
          <View style={styles.centerScreen}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconText}>C</Text>
            </View>
            <Text style={styles.errorTitle}>
              {search ? 'No matching customers' : 'No customers yet'}
            </Text>
            <Text style={styles.errorMessage}>
              {search
                ? 'Try a different search term.'
                : 'Add your first customer to start invoicing them.'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push(`/companies/${companyId}/customers/create` as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.addButtonText}>Add Customer</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={NAVY} colors={[NAVY]} progressBackgroundColor="#fff" />
            }
            renderItem={({ item }) => (
              <CustomerCard customer={item} companyId={companyId} router={router} />
            )}
          />
        )}

        {customers.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              router.push(`/companies/${companyId}/customers/create` as any);
            }}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

// ───────────────────────────────────────────
// Customer Card
// ───────────────────────────────────────────
function CustomerCard({
  customer,
  companyId,
  router,
}: {
  customer: Customer;
  companyId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const completionColor =
    customer.completion_percent >= 100 ? GREEN : customer.completion_percent >= 50 ? AMBER : ERROR;
  const taxId = customer.trn || customer.vat_number || '';

  const open = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/companies/${companyId}/customers/${customer.id}` as any);
  };

  const copyTax = async () => {
    if (!taxId) return;
    await Clipboard.setStringAsync(taxId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    swipeRef.current?.close();
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
            style={[styles.swipeBtn, { backgroundColor: '#2563eb' }]}
            onPress={() => {
              swipeRef.current?.close();
              open();
            }}
            activeOpacity={0.85}
          >
            <Feather name="eye" size={16} color="#fff" />
            <Text style={styles.swipeBtnText}>Open</Text>
          </TouchableOpacity>
          {!!taxId && (
            <TouchableOpacity
              style={[styles.swipeBtn, { backgroundColor: NAVY }]}
              onPress={copyTax}
              activeOpacity={0.85}
            >
              <Feather name="copy" size={16} color="#fff" />
              <Text style={styles.swipeBtnText}>Copy TRN</Text>
            </TouchableOpacity>
          )}
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
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={open}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{customer.name?.[0]?.toUpperCase() ?? 'C'}</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
            <View style={styles.typeRow}>
              <View style={styles.typePill}>
                <Text style={styles.typePillText}>{customer.customer_type_display}</Text>
              </View>
              {customer.is_complete ? (
                <View style={styles.readyPill}>
                  <Feather name="check" size={11} color={GREEN} />
                  <Text style={styles.readyPillText}>Ready</Text>
                </View>
              ) : (
                <View style={[styles.completionBadge, { backgroundColor: `${completionColor}1A` }]}>
                  <Text style={[styles.completionText, { color: completionColor }]}>
                    {customer.completion_percent}%
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={MUTED} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardTrn} numberOfLines={1}>
            {customer.trn ? `TRN ${customer.trn}` : customer.vat_number ? `VAT ${customer.vat_number}` : 'No tax ID'}
          </Text>
          <View style={styles.countryChip}>
            <Feather name="map-pin" size={11} color={SLATE} />
            <Text style={styles.countryChipText}>{customer.country}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 32 },

  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, backgroundColor: BG },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: '#1e293b', padding: 0 },

  listContent: { padding: 16, paddingTop: 10, paddingBottom: 100 },

  // Status indicator pills
  statsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 6, marginBottom: 2 },
  statPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 11, paddingHorizontal: 14,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: NAVY, letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: MUTED, fontWeight: '600', marginTop: -1 },

  // Swipe
  swipeContainer: {
    marginBottom: 12, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: {
    width: 82, alignItems: 'center', justifyContent: 'center', gap: 4, alignSelf: 'stretch',
  },
  swipeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 19, fontWeight: '800' },
  cardHeaderText: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '700', color: NAVY, letterSpacing: -0.2 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  typePill: { backgroundColor: '#eef2f7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  typePillText: { fontSize: 11, color: SLATE, fontWeight: '700', letterSpacing: 0.3 },
  readyPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#e8f7ef', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  readyPillText: { fontSize: 11, color: GREEN, fontWeight: '700' },
  completionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  completionText: { fontSize: 11, fontWeight: '700' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  cardTrn: { fontSize: 11.5, color: MUTED, fontWeight: '500', flex: 1, marginRight: 10 },
  countryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  countryChipText: { fontSize: 11.5, color: SLATE, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 26, right: 22, width: 62, height: 62, borderRadius: 31,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300', marginTop: -3 },

  emptyIconCircle: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#eef1f5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyIconText: { fontSize: 22, fontWeight: '700', color: SLATE },

  errorTitle: { fontSize: 17, fontWeight: '700', color: NAVY, marginBottom: 6, textAlign: 'center' },
  errorMessage: { fontSize: 13.5, color: SLATE, textAlign: 'center', marginBottom: 22, lineHeight: 19 },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  addButton: { backgroundColor: NAVY, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});