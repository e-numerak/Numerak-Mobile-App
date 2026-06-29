import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Drawer } from 'expo-router/drawer';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useRouter, usePathname, useNavigation } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

// Header-left that adapts per screen: a back arrow when there's history to pop,
// otherwise the drawer hamburger (so root/sidebar screens still open the menu).
function SmartHeaderLeft() {
  const navigation = useNavigation();
  if (navigation.canGoBack()) {
    return (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ paddingLeft: 14, paddingRight: 6 }}
      >
        <Text style={{ color: '#fff', fontSize: 32, lineHeight: 32, marginTop: -3 }}>‹</Text>
      </TouchableOpacity>
    );
  }
  return <DrawerToggleButton tintColor="#fff" />;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
// Responsive drawer width: 80% of screen on small phones, capped at 320px on tablets
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

function DrawerContent() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const menuItems = [
    { label: '📊  Dashboard', route: '/dashboard' },
    { label: '🏢  Companies', route: '/companies' },
    { label: '🧑‍💼  Customers', route: '/customers' },
    { label: '🧾  Invoices', route: '/invoices' },
    { label: '📥  Inbound', route: '/inbound' },
    { label: '📈  Reports', route: '/reports' },
    { label: '🔍  OCR', route: '/ocr' },
    { label: '🛡️  Fraud', route: '/fraud' },
    { label: '💬  Chat', route: '/chat' },
    { label: '👥  Buyers', route: '/buyers' },
    { label: '⚙️  Settings', route: '/settings/profile' },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.drawerContainer}>
      <View style={[styles.userSection, { paddingTop: insets.top + 20 }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.first_name?.[0]?.toUpperCase() ?? 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Scrollable menu */}
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menuSection}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item) => {
          const active = pathname === item.route || pathname.startsWith(item.route + '/');
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => router.replace(item.route as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Logout — always visible at bottom */}
      <TouchableOpacity
        style={[styles.logoutButton, { marginBottom: insets.bottom + 16 }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>🚪  Logout</Text>
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
        <ActivityIndicator size="large" color="#2563eb" />
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
          headerStyle: { backgroundColor: '#1e3a5f' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerLeft: () => <SmartHeaderLeft />,
          drawerStyle: { width: DRAWER_WIDTH },
          drawerType: 'front',
          overlayColor: 'rgba(0,0,0,0.5)',
          swipeEdgeWidth: 60,
        }}
      >
        <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Drawer.Screen name="companies/index" options={{ title: 'Companies' }} />
        <Drawer.Screen name="customers/index" options={{ title: 'Customers' }} />
        <Drawer.Screen name="invoices/index" options={{ title: 'Invoices' }} />
        <Drawer.Screen name="inbound/index" options={{ title: 'Inbound' }} />
        <Drawer.Screen name="reports/index" options={{ title: 'Reports' }} />
        <Drawer.Screen name="ocr/index" options={{ title: 'OCR' }} />
        <Drawer.Screen name="fraud/index" options={{ title: 'Fraud Detection' }} />
        <Drawer.Screen name="chat/index" options={{ title: 'AI Chat' }} />
        <Drawer.Screen name="buyers/index" options={{ title: 'Buyers' }} />
        <Drawer.Screen name="settings/profile" options={{ title: 'Settings' }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  drawerContainer: { flex: 1, backgroundColor: '#fff' },
  userSection: { backgroundColor: '#1e3a5f', padding: 24, paddingTop: 28, alignItems: 'center' },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#ffffff40' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  userName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  userEmail: { color: '#93c5fd', fontSize: 12, marginBottom: 10 },
  roleBadge: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  menuScroll: { flex: 1 },
  menuSection: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 8 },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginVertical: 2 },
  menuItemActive: { backgroundColor: '#eef2f8' },
  menuLabel: { fontSize: 15, color: '#1e3a5f', fontWeight: '500' },
  menuLabelActive: { fontWeight: '800' },
  logoutButton: { marginHorizontal: 16, marginTop: 8, padding: 14, backgroundColor: '#fff1f2', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fecdd3' },
  logoutText: { color: '#be123c', fontSize: 15, fontWeight: '600' },
});