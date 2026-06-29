import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useCustomers } from '../../../../src/hooks/useCustomers';
import type { Customer } from '../../../../src/types/customer.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';
const GREEN = '#16a34a';
const AMBER = '#d97706';

export default function CompanyCustomersScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useCustomers({
    company_id: companyId,
    search: search.trim() || undefined,
  });

  const customers = data?.results ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Customers' }} />
      <View style={styles.screen}>
        {/* Search bar */}
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, TRN, or email"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {isLoading ? (
          <View style={styles.centerScreen}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        ) : isError ? (
          <View style={styles.centerScreen}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Couldn't load customers</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : customers.length === 0 ? (
          <View style={styles.centerScreen}>
            <Text style={styles.errorIcon}>🧑‍💼</Text>
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
              >
                <Text style={styles.addButtonText}>+ Add Customer</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[NAVY]} />
            }
            renderItem={({ item }) => (
              <CustomerCard customer={item} companyId={companyId} router={router} />
            )}
          />
        )}

        {customers.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push(`/companies/${companyId}/customers/create` as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.fabText}>+</Text>
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
  const completionColor =
    customer.completion_percent >= 100 ? GREEN : customer.completion_percent >= 50 ? AMBER : '#dc2626';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/companies/${companyId}/customers/${customer.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{customer.name?.[0]?.toUpperCase() ?? 'C'}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerType}>{customer.customer_type_display}</Text>
        </View>
        {!customer.is_complete && (
          <View style={[styles.completionBadge, { backgroundColor: `${completionColor}1A` }]}>
            <Text style={[styles.completionText, { color: completionColor }]}>
              {customer.completion_percent}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>
          {customer.trn ? `TRN: ${customer.trn}` : customer.vat_number ? `VAT: ${customer.vat_number}` : 'No tax ID'}
        </Text>
        <Text style={styles.cardFooterText}>📍 {customer.country}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },

  searchWrap: { padding: 16, paddingBottom: 8, backgroundColor: BG },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },

  listContent: { padding: 16, paddingTop: 8, paddingBottom: 100 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardHeaderText: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '700', color: NAVY },
  customerType: { fontSize: 12, color: SLATE, marginTop: 2 },
  completionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  completionText: { fontSize: 11, fontWeight: '700' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER,
  },
  cardFooterText: { fontSize: 12, color: SLATE },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '400', marginTop: -2 },

  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: SLATE, textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  addButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});