import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Responsive drawer width: 80% of screen on small phones, capped at 320px on tablets
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

function DrawerContent() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

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
      <View style={styles.userSection}>
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

      <View style={styles.menuSection}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  userSection: { backgroundColor: '#1e3a5f', padding: 24, paddingTop: 48, alignItems: 'center' },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#ffffff40' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  userName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  userEmail: { color: '#93c5fd', fontSize: 12, marginBottom: 10 },
  roleBadge: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  menuSection: { flex: 1, paddingTop: 8, paddingHorizontal: 12 },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginVertical: 2 },
  menuLabel: { fontSize: 15, color: '#1e3a5f', fontWeight: '500' },
  logoutButton: { margin: 16, padding: 14, backgroundColor: '#fff1f2', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fecdd3' },
  logoutText: { color: '#be123c', fontSize: 15, fontWeight: '600' },
});