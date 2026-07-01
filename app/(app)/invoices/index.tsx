import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { useInvoices } from '../../../src/hooks/useInvoices';
import { InvoiceStatusBadge } from '../../../src/components/InvoiceStatusBadge';
import { INVOICE_ENDPOINTS } from '../../../src/constants/api';
import { downloadAndShare } from '../../../src/utils/downloads';
import { LoadingScreen, SkeletonList } from '../../../src/components/Loading';
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
  } = useInvoices({
    company_id: companyId,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const invoices = data?.results ?? [];
  const totalCount = data?.pagination?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
            <Text style={styles.subtitle}>{totalCount} total</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.catalogBtn}
          onPress={() =>
            router.push({ pathname: '/invoices/products', params: { companyId } } as any)
          }
        >
          <Feather name="package" size={18} color={NAVY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() =>
            router.push({ pathname: '/invoices/create', params: { companyId } } as any)
          }
        >
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

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
          onPress={() =>
            router.push({ pathname: '/invoices/gap-report', params: { companyId } } as any)
          }
        >
          <Feather name="shield" size={15} color={NAVY} />
          <Text style={styles.toolBtnText}>Gap Report</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <SkeletonList count={6} />
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
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <InvoiceRow
              invoice={item}
              onPress={() => router.push(`/invoices/${item.id}` as any)}
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
                    onPress={() => setPage((p) => p - 1)}
                  >
                    <Text style={styles.pageBtnText}>Previous</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                    disabled={page >= totalPages}
                    onPress={() => setPage((p) => p + 1)}
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
  onPress,
}: {
  invoice: InvoiceListItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowTop}>
        <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
        <Text style={styles.amount}>
          {formatMoney(invoice.total_amount, invoice.currency)}
        </Text>
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
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            downloadAndShare(
              INVOICE_ENDPOINTS.downloadPdf(invoice.id),
              `${invoice.invoice_number}.pdf`,
              'application/pdf'
            )
          }
        >
          <Feather name="file-text" size={14} color={SLATE} />
          <Text style={styles.iconBtnText}>PDF</Text>
        </TouchableOpacity>
        {invoice.has_xml && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              downloadAndShare(
                INVOICE_ENDPOINTS.downloadXml(invoice.id),
                `${invoice.invoice_number}.xml`,
                'application/xml'
              )
            }
          >
            <Feather name="download" size={14} color={SLATE} />
            <Text style={styles.iconBtnText}>XML</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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

  chipsScroll: { flexGrow: 0 },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' },

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

  row: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
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
