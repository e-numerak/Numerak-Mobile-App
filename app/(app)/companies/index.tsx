import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCompanies } from '../../../src/hooks/useCompanies';
import type { Company } from '../../../src/types/company.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';

export default function CompaniesScreen() {
  const router = useRouter();
  const { data: companies, isLoading, isError, error, refetch, isRefetching } =
    useCompanies();

  // ── Loading state ──────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={NAVY} />
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
  return (
    <View style={styles.screen}>
      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[NAVY]} />
        }
        renderItem={({ item }) => <CompanyCard company={item} router={router} />}
      />

      {/* Floating Add button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/companies/create' as any)}
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
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/companies/${company.id}` as any)}
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

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
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