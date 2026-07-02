import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { useInvoices } from '../../../src/hooks/useInvoices';
import { InvoiceStatusBadge } from '../../../src/components/InvoiceStatusBadge';
import { INVOICE_ENDPOINTS } from '../../../src/constants/api';
import { downloadAndShare } from '../../../src/utils/downloads';
import { LoadingScreen, Shimmer } from '../../../src/components/Loading';
import type { Company } from '../../../src/types/company.types';
import type { InvoiceListItem, InvoiceStatus } from '../../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';

const PAGE_SIZE = 20;

// Mirrors the web status filter dropdown (same order, same options).
const STATUS_FILTERS: { value: '' | InvoiceStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'validated', label: 'Validated' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'paid', label: 'Paid' },
];

function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  try {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

// ── Animated count-up number ───────────────────────────────────────────────────
function AnimatedNumber({
  value,
  format,
  style,
  duration = 800,
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
  const maxH = height.interpolate({ inputRange: [0, 1], outputRange: [0, 38] });

  return (
    <Animated.View style={[styles.refreshBar, { height: maxH, opacity: height }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Feather name="loader" size={15} color={NAVY} />
      </Animated.View>
      <Text style={styles.refreshText}>Refreshing…</Text>
    </Animated.View>
  );
}

// ── Shimmer skeleton list matching the invoice-row shape ────────────────────────
function InvoiceSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.listContent}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowTop}>
            <Shimmer width="45%" height={16} />
            <Shimmer width={80} height={16} />
          </View>
          <Shimmer width="60%" height={12} style={{ marginTop: 10 }} />
          <View style={[styles.rowBottom, { marginTop: 12 }]}>
            <Shimmer width="35%" height={12} />
            <Shimmer width={72} height={22} radius={999} />
          </View>
          <View style={styles.rowActions}>
            <Shimmer width={58} height={28} radius={8} />
            <Shimmer width={58} height={28} radius={8} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { data: companies, isLoading: companiesLoading } = useCompanies();

  const [companyId, setCompanyId] = useState<string>('');
  const [status, setStatus] = useState<'' | InvoiceStatus>('');
  const [page, setPage] = useState(1);

  // Auto-select the first company once they load (web keeps one "active" company).
  useEffect(() => {
    if (!companyId && companies && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    isRefetching,
  } = useInvoices({
    company_id: companyId,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const invoices = data?.results ?? [];
  const totalCount = data?.pagination?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Sum of the amounts currently on screen (for the animated metrics strip).
  const pageTotal = invoices.reduce((sum, inv) => sum + Number(inv.total_amount ?? 0), 0);
  const pageCurrency = invoices[0]?.currency ?? 'AED';

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    refetch();
  };

  // ── No companies at all ────────────────────────────────────────────────────
  if (companiesLoading) {
    return <LoadingScreen label="Loading your workspace…" />;
  }

  if (!companies || companies.length === 0) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.emoji}>🏢</Text>
        <Text style={styles.errorTitle}>No companies yet</Text>
        <Text style={styles.errorMessage}>
          Add a company first, then you can create and view its invoices.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/companies/create' as any)}
        >
          <Text style={styles.primaryBtnText}>+ Add Company</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedCompany = companies.find((c) => c.id === companyId);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Invoices</Text>
          {totalCount > 0 && (
            <AnimatedNumber
              value={totalCount}
              format={(n) => `${Math.round(n)} total`}
              style={styles.subtitle}
            />
          )}
        </View>
        <TouchableOpacity
          style={styles.catalogBtn}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.push({ pathname: '/invoices/products', params: { companyId } } as any);
          }}
        >
          <Feather name="package" size={18} color={NAVY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push({ pathname: '/invoices/create', params: { companyId } } as any);
          }}
        >
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Animated metrics strip — value of the invoices currently shown */}
      {!isLoading && invoices.length > 0 && (
        <View style={styles.metricsStrip}>
          <View style={styles.metricItem}>
            <Feather name="layers" size={13} color={SLATE} />
            <AnimatedNumber
              value={invoices.length}
              format={(n) => `${Math.round(n)} shown`}
              style={styles.metricText}
            />
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Feather name="dollar-sign" size={13} color={SLATE} />
            <AnimatedNumber
              value={pageTotal}
              format={(n) => formatMoney(String(n), pageCurrency)}
              style={styles.metricTextStrong}
            />
          </View>
        </View>
      )}

      {/* Company selector — only when more than one company */}
      {companies.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          {companies.map((c: Company) => {
            const active = c.id === companyId;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.companyChip, active && styles.companyChipActive]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setCompanyId(c.id);
                  setPage(1);
                }}
              >
                <Text style={[styles.companyChipText, active && styles.companyChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.singleCompany}>{selectedCompany?.name}</Text>
      )}

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {STATUS_FILTERS.map((s) => {
          const active = s.value === status;
          return (
            <TouchableOpacity
              key={s.value || 'all'}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setStatus(s.value);
                setPage(1);
              }}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Toolbar — export + compliance */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            const url =
              `${INVOICE_ENDPOINTS.export}?company_id=${companyId}` +
              (status ? `&status=${status}` : '');
            downloadAndShare(url, `invoices_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
          }}
        >
          <Feather name="download" size={15} color={NAVY} />
          <Text style={styles.toolBtnText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.push({ pathname: '/invoices/gap-report', params: { companyId } } as any);
          }}
        >
          <Feather name="shield" size={15} color={NAVY} />
          <Text style={styles.toolBtnText}>Gap Report</Text>
        </TouchableOpacity>
      </View>

      {/* Custom animated refresh indicator */}
      <RefreshSpinner visible={isRefetching} />

      {/* List */}
      {isLoading ? (
        <InvoiceSkeletonList count={6} />
      ) : isError ? (
        <View style={styles.centerFlex}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Couldn't load invoices</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.centerFlex}>
          <Text style={styles.emoji}>🧾</Text>
          <Text style={styles.errorTitle}>No invoices found</Text>
          <Text style={styles.errorMessage}>
            Create your first invoice to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              tintColor={NAVY}
              colors={[NAVY]}
              progressBackgroundColor="#fff"
            />
          }
          renderItem={({ item }) => (
            <InvoiceRow
              invoice={item}
              onOpen={() => router.push(`/invoices/${item.id}` as any)}
            />
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <Text style={styles.pageText}>
                  Page {page} of {totalPages}
                </Text>
                <View style={styles.pageButtons}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                    disabled={page <= 1}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setPage((p) => p - 1);
                    }}
                  >
                    <Text style={styles.pageBtnText}>Previous</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                    disabled={page >= totalPages}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setPage((p) => p + 1);
                    }}
                  >
                    <Text style={styles.pageBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function InvoiceRow({
  invoice,
  onOpen,
}: {
  invoice: InvoiceListItem;
  onOpen: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const copyNumber = async () => {
    await Clipboard.setStringAsync(invoice.invoice_number);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    swipeRef.current?.close();
  };

  const downloadPdf = () => {
    Haptics.selectionAsync().catch(() => {});
    swipeRef.current?.close();
    downloadAndShare(
      INVOICE_ENDPOINTS.downloadPdf(invoice.id),
      `${invoice.invoice_number}.pdf`,
      'application/pdf'
    );
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-210, -105, 0],
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
            style={[styles.swipeBtn, { backgroundColor: '#0d9488' }]}
            onPress={downloadPdf}
            activeOpacity={0.85}
          >
            <Feather name="file-text" size={16} color="#fff" />
            <Text style={styles.swipeBtnText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeBtn, { backgroundColor: NAVY }]}
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
      containerStyle={styles.swipeContainer}
    >
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onOpen();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.rowTop}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <AnimatedNumber
            value={Number(invoice.total_amount ?? 0)}
            format={(n) => formatMoney(String(n), invoice.currency)}
            style={styles.amount}
          />
        </View>

        <Text style={styles.customer}>{invoice.customer_name}</Text>

        <View style={styles.rowBottom}>
          <View style={styles.metaLeft}>
            <Text style={styles.meta}>{invoice.type_display}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.meta}>{invoice.issue_date}</Text>
          </View>
          <View style={styles.badgeCol}>
            <InvoiceStatusBadge status={invoice.status} label={invoice.status_display} />
            {invoice.buyer_viewed_at && (
              <View style={styles.viewedPill}>
                <Feather name="eye" size={11} color="#0d9488" />
                <Text style={styles.viewedPillText}>Buyer Viewed</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rowActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={downloadPdf}>
            <Feather name="file-text" size={14} color={SLATE} />
            <Text style={styles.iconBtnText}>PDF</Text>
          </TouchableOpacity>
          {invoice.has_xml && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                downloadAndShare(
                  INVOICE_ENDPOINTS.downloadXml(invoice.id),
                  `${invoice.invoice_number}.xml`,
                  'application/xml'
                );
              }}
            >
              <Feather name="download" size={14} color={SLATE} />
              <Text style={styles.iconBtnText}>XML</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centerScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: BG, padding: 24,
  },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: NAVY },
  subtitle: { fontSize: 12, color: SLATE, marginTop: 2 },
  catalogBtn: {
    width: 40, height: 38, borderRadius: 10, marginRight: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  createBtn: {
    backgroundColor: NAVY, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  chipsScroll: { flexGrow: 0, height: 48 },
  chipsRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },

  // Animated metrics strip
  metricsStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 4, marginBottom: 2,
    paddingVertical: 9, paddingHorizontal: 14,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  metricDivider: { width: 1, height: 20, backgroundColor: '#eef2f7' },
  metricText: { fontSize: 12.5, color: SLATE, fontWeight: '600' },
  metricTextStrong: { fontSize: 13.5, color: NAVY, fontWeight: '800' },

  // Custom refresh indicator
  refreshBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, overflow: 'hidden',
  },
  refreshText: { fontSize: 12, fontWeight: '700', color: NAVY, letterSpacing: 0.2 },

  toolbar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  toolBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
  },
  toolBtnText: { color: NAVY, fontWeight: '700', fontSize: 13 },
  singleCompany: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 13, color: SLATE, fontWeight: '600' },

  companyChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  companyChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  companyChipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  companyChipTextActive: { color: '#fff' },

  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  filterChipActive: { backgroundColor: '#eef2f7', borderColor: NAVY },
  filterChipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  filterChipTextActive: { color: NAVY, fontWeight: '700' },

  listContent: { padding: 16, paddingTop: 8 },

  swipeContainer: { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: {
    width: 66, alignItems: 'center', justifyContent: 'center', gap: 4,
    alignSelf: 'stretch',
  },
  swipeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  row: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumber: { fontSize: 15, fontWeight: '700', color: NAVY },
  amount: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  customer: { fontSize: 13, color: '#334155', marginTop: 4 },
  rowBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginTop: 10,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  meta: { fontSize: 12, color: SLATE },
  metaDot: { fontSize: 12, color: SLATE, marginHorizontal: 6 },
  badgeCol: { alignItems: 'flex-end', gap: 4 },
  viewedPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewedPillText: { fontSize: 11, color: '#0d9488', fontWeight: '600' },

  rowActions: {
    flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f1f5f9', justifyContent: 'flex-end',
  },
  iconBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff',
  },
  iconBtnText: { fontSize: 12, color: SLATE, fontWeight: '700' },

  pagination: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
  },
  pageText: { fontSize: 13, color: SLATE },
  pageButtons: { flexDirection: 'row', gap: 8 },
  pageBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, color: NAVY, fontWeight: '600' },

  emoji: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: SLATE, textAlign: 'center', marginBottom: 20 },
  primaryBtn: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
