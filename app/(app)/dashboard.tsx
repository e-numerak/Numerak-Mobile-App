import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  // Dummy stats for now — will be wired to /invoices/dashboard/ and
  // /inbound/stats/ once the API layer (Step 3) is ready.
  const stats = [
    {
      label: 'Total Invoices',
      value: '128',
      icon: '🧾',
      tint: '#2563eb',
      tintBg: '#eff6ff',
    },
    {
      label: 'Pending Inbound',
      value: '7',
      icon: '📥',
      tint: '#d97706',
      tintBg: '#fffbeb',
    },
    {
      label: 'This Month Revenue',
      value: 'AED 42,500',
      icon: '💰',
      tint: '#16a34a',
      tintBg: '#f0fdf4',
    },
  ];

  const shortcuts = [
    { label: 'Companies', icon: '🏢', route: '/companies' as const },
    { label: 'Invoices', icon: '🧾', route: '/invoices' as const },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome back, {user?.first_name ?? 'there'}
        </Text>
        <Text style={styles.subGreeting}>Here's your business at a glance</Text>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsStack}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.iconBadge, { backgroundColor: stat.tintBg }]}>
              <Text style={styles.iconBadgeText}>{stat.icon}</Text>
            </View>
            <View style={styles.statTextWrap}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.tint }]}>{stat.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.shortcutsRow}>
        {shortcuts.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.shortcutCard}
            onPress={() => router.push(item.route)}
            activeOpacity={0.75}
          >
            <Text style={styles.shortcutIcon}>{item.icon}</Text>
            <Text style={styles.shortcutLabel}>{item.label}</Text>
            <Text style={styles.shortcutArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 48,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: NAVY,
    letterSpacing: -0.3,
  },
  subGreeting: {
    fontSize: 14,
    color: SLATE,
    marginTop: 4,
  },

  // Stat cards
  statsStack: {
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconBadgeText: {
    fontSize: 22,
  },
  statTextWrap: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: SLATE,
    marginBottom: 2,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Section
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 12,
  },

  // Shortcuts
  shortcutsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 18,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  shortcutIcon: {
    fontSize: 26,
  },
  shortcutLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  shortcutArrow: {
    fontSize: 16,
    color: '#93c5fd',
    fontWeight: '700',
    alignSelf: 'flex-end',
  },
});