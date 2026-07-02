import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCompanies } from '../../../src/hooks/useCompanies';
import { Shimmer } from '../../../src/components/Loading';
import { RefreshSpinner } from '../../../src/components/AnimatedUI';
import type { Company } from '../../../src/types/company.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';

export default function CustomersCompanyPickerScreen() {
  const router = useRouter();
  const { data: companies, isLoading, isError, refetch, isRefetching } = useCompanies();

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.headerText}>Select a company to view its customers</Text>
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.row}>
              <Shimmer width={42} height={42} radius={12} />
              <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                <Shimmer width="55%" height={15} />
                <Shimmer width="35%" height={12} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Couldn't load companies</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorIcon}>🏢</Text>
        <Text style={styles.errorTitle}>No companies yet</Text>
        <Text style={styles.errorMessage}>
          Add a company first, then you can manage its customers.
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/companies/create' as any)}>
          <Text style={styles.addButtonText}>+ Add Company</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.headerText}>Select a company to view its customers</Text>
      <RefreshSpinner visible={isRefetching} color={NAVY} />
      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={NAVY} colors={[NAVY]} progressBackgroundColor="#fff" />
        }
        renderItem={({ item }) => (
          <CompanyRow
            company={item}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push(`/companies/${item.id}/customers` as any);
            }}
          />
        )}
      />
    </View>
  );
}

function CompanyRow({ company, onPress }: { company: Company; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{company.name?.[0]?.toUpperCase() ?? 'C'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.companyName}>{company.name}</Text>
        <Text style={styles.companyMeta}>{company.city}, {company.emirate?.replace('_', ' ')}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },

  headerText: { fontSize: 13, color: SLATE, padding: 16, paddingBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER,
  },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  companyName: { fontSize: 15, fontWeight: '700', color: NAVY },
  companyMeta: { fontSize: 12, color: SLATE, marginTop: 2 },
  chevron: { fontSize: 18, color: SLATE },

  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: SLATE, textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  addButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});