import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useCompany } from '../../../../src/hooks/useCompanies';
import { LoadingScreen } from '../../../../src/components/Loading';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const MUTED = '#94a3b8';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';
const ERROR = '#dc2626';
const GREEN = '#16a34a';

export default function CompanyDetailScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();

  const { data: company, isLoading, isError, refetch } = useCompany(companyId);

  if (isLoading) {
    return <LoadingScreen label="Loading company…" />;
  }

  if (isError || !company) {
    return (
      <View style={styles.centerScreen}>
        <Feather name="alert-triangle" size={44} color={ERROR} style={{ marginBottom: 14 }} />
        <Text style={styles.errorTitle}>Couldn't load this company</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: company.name }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* ── Gradient hero header ── */}
        <LinearGradient
          colors={['#1e3a5f', '#16314f', '#0c1d30']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            {company.logo_url ? (
              <Image source={{ uri: company.logo_url }} style={styles.heroLogo} />
            ) : (
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>
                  {(company.name || '?').slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            {company.is_active ? (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            ) : (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
              </View>
            )}
          </View>

          <Text style={styles.heroName}>{company.name}</Text>
          {company.legal_name && company.legal_name !== company.name ? (
            <Text style={styles.heroLegal}>{company.legal_name}</Text>
          ) : null}

          <View style={styles.heroTrnRow}>
            <Feather name="hash" size={13} color="#93c5fd" />
            <Text style={styles.heroTrnLabel}>TRN</Text>
            <Text style={styles.heroTrnValue}>{company.trn}</Text>
          </View>
        </LinearGradient>

        {/* ── Info groups ── */}
        <ViewFields company={company} />

        {/* ── Related sections ── */}
        <View style={styles.linksGroup}>
          <LinkRow
            icon="users"
            tint="#2563eb"
            bg="#eff6ff"
            label="Members"
            count={company.member_count}
            onPress={() => router.push(`/companies/${companyId}/members` as any)}
          />
          <View style={styles.linkDivider} />
          <LinkRow
            icon="user-check"
            tint={GREEN}
            bg="#f0fdf4"
            label="Customers"
            onPress={() => router.push(`/companies/${companyId}/customers` as any)}
          />
        </View>

        {/* Company edit & deactivation are admin-only — managed outside the app. */}
        <View style={styles.adminNote}>
          <Feather name="lock" size={14} color={SLATE} />
          <Text style={styles.adminNoteText}>
            Company details can only be changed by an administrator.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

// ───────────────────────────────────────────
// Related link row
// ───────────────────────────────────────────
function LinkRow({
  icon,
  tint,
  bg,
  label,
  count,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  bg: string;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.linkLeft}>
        <View style={[styles.linkIconBox, { backgroundColor: bg }]}>
          <Feather name={icon} size={17} color={tint} />
        </View>
        <Text style={styles.linkText}>{label}</Text>
      </View>
      <View style={styles.linkRight}>
        {count != null && <Text style={styles.linkCount}>{count}</Text>}
        <Feather name="chevron-right" size={18} color={MUTED} />
      </View>
    </TouchableOpacity>
  );
}

// ───────────────────────────────────────────
// View mode — icon-labeled groups, clean rows
// ───────────────────────────────────────────
function ViewFields({ company }: { company: any }) {
  const groups: {
    title: string;
    icon: keyof typeof Feather.glyphMap;
    rows: { label: string; value: any }[];
  }[] = [
    {
      title: 'Legal Information',
      icon: 'file-text',
      rows: [
        { label: 'Legal name', value: company.legal_name },
        { label: 'Registration ID', value: company.legal_registration_id },
        { label: 'Registration type', value: company.legal_registration_type },
        { label: 'VAT group', value: company.is_vat_group ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Address',
      icon: 'map-pin',
      rows: [{ label: 'Full address', value: company.formatted_address }],
    },
    {
      title: 'Contact',
      icon: 'phone',
      rows: [
        { label: 'Phone', value: company.phone },
        { label: 'Email', value: company.email },
        { label: 'Website', value: company.website },
      ],
    },
  ];

  return (
    <>
      {groups.map((group) => (
        <View key={group.title} style={styles.card}>
          <View style={styles.groupHead}>
            <View style={styles.groupIcon}>
              <Feather name={group.icon} size={14} color={NAVY} />
            </View>
            <Text style={styles.groupTitle}>{group.title}</Text>
          </View>
          {group.rows.map((row, i) => (
            <View
              key={row.label}
              style={[styles.viewRow, i === group.rows.length - 1 && styles.viewRowLast]}
            >
              <Text style={styles.viewLabel}>{row.label}</Text>
              <Text
                style={row.value ? styles.viewValue : styles.viewValueEmpty}
                numberOfLines={2}
              >
                {row.value || 'Not provided'}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 48 },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },

  // Hero
  hero: {
    borderRadius: 20, padding: 20, marginBottom: 14,
    shadowColor: '#1e3a5f', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 14, elevation: 5,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLogo: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#fff' },
  heroAvatar: {
    width: 54, height: 54, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  heroName: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 14, letterSpacing: -0.3 },
  heroLegal: { color: '#cbd5e1', fontSize: 13, marginTop: 3 },
  heroTrnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  heroTrnLabel: { color: '#93c5fd', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  heroTrnValue: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },

  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, gap: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#bbf7d0' },
  inactiveBadge: { backgroundColor: 'rgba(248,113,113,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '800', color: '#fca5a5', letterSpacing: 0.5 },

  // Grouped view card
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  groupIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#eef2f8', alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 13, fontWeight: '800', color: NAVY, letterSpacing: 0.2 },

  viewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 16,
  },
  viewRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  viewLabel: { fontSize: 13.5, color: SLATE },
  viewValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1, textAlign: 'right' },
  viewValueEmpty: { fontSize: 13, color: MUTED, fontStyle: 'italic', flex: 1, textAlign: 'right' },

  // Related links group
  linksGroup: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
  linkDivider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  linkRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkCount: { fontSize: 14, color: SLATE, fontWeight: '700' },

  adminNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: BORDER,
  },
  adminNoteText: { color: SLATE, fontSize: 13, fontWeight: '500' },

  errorTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 16 },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
