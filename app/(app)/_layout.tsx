import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useRouter, usePathname, useNavigation } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';

// Header-left that adapts per screen: a back arrow when there's history to pop,
// otherwise the drawer hamburger (so root/sidebar screens still open the menu).
function SmartHeaderLeft() {
  const navigation = useNavigation();
  if (navigation.canGoBack()) {
    return (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ paddingLeft: 12, paddingRight: 6 }}
      >
        <Feather name="chevron-left" size={26} color="#fff" />
      </TouchableOpacity>
    );
  }
  return <DrawerToggleButton tintColor="#fff" />;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
// Responsive drawer width: 80% of screen on small phones, capped at 320px on tablets
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 330);

type MenuItem = { label: string; route: string; icon: keyof typeof Feather.glyphMap };

const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'grid' },
  { label: 'Companies', route: '/companies', icon: 'briefcase' },
  { label: 'Customers', route: '/customers', icon: 'users' },
  { label: 'Invoices', route: '/invoices', icon: 'file-text' },
  { label: 'Product Catalog', route: '/invoices/products', icon: 'package' },
  { label: 'Reports', route: '/reports', icon: 'bar-chart-2' },
  { label: 'Settings', route: '/settings/profile', icon: 'settings' },
];

function DrawerContent() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const initials =
    `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <View style={styles.drawerContainer}>
      {/* Gradient user header */}
      <LinearGradient
        colors={['#1e3a5f', '#16314f', '#0c1d30']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.userSection, { paddingTop: insets.top + 22 }]}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>EN</Text>
          </View>
          <Text style={styles.brandName}>E-Numerak</Text>
        </View>

        <View style={styles.userRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>

        <View style={styles.roleBadge}>
          <Feather name="award" size={11} color="#bfdbfe" />
          <Text style={styles.roleText}>{user?.role?.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
      </LinearGradient>

      {/* Scrollable menu */}
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menuSection}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.menuHeading}>MENU</Text>
        {(() => {
          // Only the most specific matching route is highlighted (so /invoices/products
          // highlights "Product Catalog", not "Invoices").
          const activeRoute = MENU_ITEMS.filter(
            (it) => pathname === it.route || pathname.startsWith(it.route + '/')
          ).sort((a, b) => b.route.length - a.route.length)[0]?.route;
          return MENU_ITEMS.map((item) => {
            const active = item.route === activeRoute;
            return (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => router.replace(item.route as any)}
              activeOpacity={0.7}
            >
              {active && <View style={styles.activeAccent} />}
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Feather name={item.icon} size={17} color={active ? '#fff' : SLATE} />
              </View>
              <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>
                {active && <Feather name="chevron-right" size={16} color={NAVY} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            );
          });
        })()}
      </ScrollView>

      {/* Logout — always visible at bottom */}
      <TouchableOpacity
        style={[styles.logoutButton, { marginBottom: insets.bottom + 16 }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={17} color="#be123c" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={() => <DrawerContent />}
        screenOptions={{
          headerStyle: { backgroundColor: NAVY },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerLeft: () => <SmartHeaderLeft />,
          drawerStyle: { width: DRAWER_WIDTH },
          drawerType: 'front',
          overlayColor: 'rgba(15,23,42,0.55)',
          swipeEdgeWidth: 60,
        }}
      >
        <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Drawer.Screen name="companies/index" options={{ title: 'Companies' }} />
        <Drawer.Screen name="customers/index" options={{ title: 'Customers' }} />
        <Drawer.Screen name="invoices/index" options={{ title: 'Invoices' }} />
        <Drawer.Screen name="reports/index" options={{ title: 'Reports' }} />
        <Drawer.Screen name="settings/profile" options={{ title: 'Settings' }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  drawerContainer: { flex: 1, backgroundColor: '#fff' },

  userSection: { paddingHorizontal: 20, paddingBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  brandBadge: {
    width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  brandBadgeText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  brandName: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  userName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  userEmail: { color: '#93c5fd', fontSize: 12, marginTop: 2 },

  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, marginTop: 14,
  },
  roleText: { color: '#dbeafe', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  menuScroll: { flex: 1 },
  menuSection: { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 8 },
  menuHeading: {
    fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1,
    marginLeft: 12, marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, marginVertical: 2,
  },
  menuItemActive: { backgroundColor: '#eef4fb' },
  activeAccent: {
    position: 'absolute', left: 0, top: 10, bottom: 10, width: 3.5,
    borderRadius: 2, backgroundColor: NAVY,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: NAVY },
  menuLabel: { fontSize: 15, color: '#334155', fontWeight: '600' },
  menuLabelActive: { color: NAVY, fontWeight: '800' },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, padding: 14, backgroundColor: '#fff1f2',
    borderRadius: 12, borderWidth: 1, borderColor: '#fecdd3',
  },
  logoutText: { color: '#be123c', fontSize: 15, fontWeight: '700' },
});
