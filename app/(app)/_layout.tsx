import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, Animated, Easing,
  Platform, StatusBar,
} from 'react-native';
import {
  GestureHandlerRootView,
  ScrollView,
  TouchableOpacity as GHTouchableOpacity,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useIsFetching } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1a2332',
  primaryDark: '#0d141e',
  primaryLight: '#2a3649',
  accent: '#5b7cfa',
  accentLight: '#8ba3fc',
  accentDark: '#3a5ad6',
  success: '#2d9b6e',
  warning: '#e8a838',
  error: '#d45a5a',
  surface: '#f5f6fa',
  card: '#ffffff',
  text: '#1a2332',
  textSecondary: '#5a6b7c',
  textMuted: '#8a9baa',
  border: '#e8ecf0',
  borderLight: '#f0f2f5',
  shadow: 'rgba(26, 35, 50, 0.08)',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

// Modern font family configuration
const FONTS = {
  regular: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  medium: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium',
  semibold: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium',
  bold: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-condensed',
};

const TYPOGRAPHY = {
  h1: { 
    fontSize: 26, 
    fontWeight: '800' as const, 
    lineHeight: 34,
    fontFamily: FONTS.bold,
    letterSpacing: -0.5,
  },
  h2: { 
    fontSize: 18, 
    fontWeight: '700' as const, 
    lineHeight: 24,
    fontFamily: FONTS.semibold,
    letterSpacing: -0.3,
  },
  h3: { 
    fontSize: 15, 
    fontWeight: '600' as const, 
    lineHeight: 20,
    fontFamily: FONTS.medium,
    letterSpacing: -0.2,
  },
  body: { 
    fontSize: 14, 
    fontWeight: '500' as const, 
    lineHeight: 20,
    fontFamily: FONTS.regular,
  },
  bodySmall: { 
    fontSize: 12, 
    fontWeight: '500' as const, 
    lineHeight: 16,
    fontFamily: FONTS.regular,
  },
  caption: { 
    fontSize: 10, 
    fontWeight: '600' as const, 
    lineHeight: 14,
    fontFamily: FONTS.medium,
    letterSpacing: 0.3,
  },
  overline: { 
    fontSize: 9, 
    fontWeight: '700' as const, 
    lineHeight: 12, 
    letterSpacing: 1.8,
    fontFamily: FONTS.semibold,
    textTransform: 'uppercase' as const,
  },
};

type MenuItem = { 
  label: string; 
  route: string; 
  icon: keyof typeof Feather.glyphMap;
  badge?: number;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'grid' },
  { label: 'Companies', route: '/companies', icon: 'briefcase' },
  { label: 'Customers', route: '/customers', icon: 'users' },
  { label: 'Invoices', route: '/invoices', icon: 'file-text'},
  { label: 'Product Catalog', route: '/invoices/products', icon: 'package' },
  { label: 'Receivables', route: '/receivables', icon: 'dollar-sign' },
  { label: 'Reports', route: '/reports', icon: 'bar-chart-2' },
  { label: 'Settings', route: '/settings/profile', icon: 'settings' },
];

const TOP_LEVEL_ROUTES = MENU_ITEMS.map((m) => m.route);

function parentPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 1) return null;
  parts.pop();
  return '/' + parts.join('/');
}

function SmartHeaderLeft() {
  const router = useRouter();
  const pathname = usePathname();
  const isTop = TOP_LEVEL_ROUTES.includes(pathname);

  if (isTop) {
    return (
      <View style={{ marginLeft: 6 }}>
        <DrawerToggleButton tintColor="#fff" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => {
        const parent = parentPath(pathname);
        router.navigate((parent ?? '/dashboard') as any);
      }}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      style={{ paddingLeft: 14, paddingRight: 6 }}
    >
      <Feather name="chevron-left" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);
const BAR_W = SCREEN_WIDTH * 0.35;

// ── Global loading bar ────────────────────────────────────────────────────────
function GlobalLoadingBar() {
  const fetching = useIsFetching();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-BAR_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (fetching > 0) {
      opacity.setValue(1);
      slide.setValue(-BAR_W);
      const loop = Animated.loop(
        Animated.timing(slide, {
          toValue: SCREEN_WIDTH,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }
    Animated.timing(opacity, { 
      toValue: 0, 
      duration: 250, 
      useNativeDriver: true 
    }).start();
  }, [fetching]);

  return (
    <Animated.View 
      pointerEvents="none" 
      style={[
        styles.barTrack, 
        { 
          top: insets.top + (Platform.OS === 'ios' ? 0 : 0), 
          opacity 
        }
      ]}
    >
      <Animated.View style={[styles.barFill, { transform: [{ translateX: slide }] }]}>
        <LinearGradient
          colors={[
            'rgba(91, 124, 250, 0)',
            COLORS.accent,
            COLORS.accentLight,
            COLORS.accent,
            'rgba(91, 124, 250, 0)'
          ]}
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ── Drawer content ────────────────────────────────────────────────────────────
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

  const activeRoute = MENU_ITEMS
    .filter((it) => pathname === it.route || pathname.startsWith(it.route + '/'))
    .sort((a, b) => b.route.length - a.route.length)[0]?.route;

  const userFullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const roleDisplay = user?.role?.replace(/_/g, ' ').toUpperCase() || 'USER';

  return (
    <View style={styles.drawer}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }}
        style={[styles.drawerHeader, { paddingTop: insets.top + 20 }]}
      >
        {/* Brand */}
        <View style={styles.brandSection}>
          <View style={styles.brandLogo}>
            <View style={styles.brandIcon}>
              <LinearGradient
                colors={[COLORS.accent, COLORS.accentLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brandIconGradient}
              >
                <Text style={styles.brandIconText}>EN</Text>
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.brandName}>E-Numerak</Text>
              <Text style={styles.brandSubtitle}>PEPPOL Invoicing</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* User Profile */}
        <View style={styles.userSection}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {userFullName || 'User'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || 'user@example.com'}
            </Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>{roleDisplay}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Menu ── */}
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.menuHeading}>Main Navigation</Text>
        {MENU_ITEMS.map((item) => {
          const active = item.route === activeRoute;
          return (
            <GHTouchableOpacity
              key={item.route}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => router.navigate(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, active && styles.menuIconBoxActive]}>
                <Feather 
                  name={item.icon} 
                  size={17} 
                  color={active ? COLORS.accent : COLORS.textSecondary} 
                />
              </View>
              <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              {active && (
                <View style={styles.activeIndicator} />
              )}
            </GHTouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 12 }]}>
        <GHTouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={17} color={COLORS.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </GHTouchableOpacity>
        <Text style={styles.footerVersion}>v2.4.0</Text>
      </View>
    </View>
  );
}

// ── App layout ────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <Drawer
        drawerContent={() => <DrawerContent />}
        screenOptions={{
          headerStyle: { 
            backgroundColor: COLORS.primary,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            ...TYPOGRAPHY.h2,
            color: '#fff',
          },
          headerLeft: () => <SmartHeaderLeft />,
          drawerStyle: { 
            width: DRAWER_WIDTH,
            backgroundColor: COLORS.surface,
          },
          drawerType: 'front',
          overlayColor: 'rgba(26, 35, 50, 0.5)',
          swipeEdgeWidth: 60,
          
        }}
      >
        <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Drawer.Screen name="companies/index" options={{ title: 'Companies' }} />
        <Drawer.Screen name="customers/index" options={{ title: 'Customers' }} />
        <Drawer.Screen name="invoices/index" options={{ title: 'Invoices' }} />
        <Drawer.Screen name="receivables/index" options={{ title: 'Receivables' }} />
        <Drawer.Screen name="reports/index" options={{ title: 'Reports' }} />
        <Drawer.Screen name="settings/profile" options={{ title: 'Settings' }} />
      </Drawer>
      <GlobalLoadingBar />
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    marginTop: 12,
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Loading bar
  barTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2.5,
    zIndex: 9999,
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: BAR_W,
  },

  // Drawer shell
  drawer: { 
    flex: 1, 
    backgroundColor: COLORS.surface,
  },

  // Header
  drawerHeader: { 
    paddingHorizontal: SPACING.lg, 
    paddingBottom: SPACING.xl,
  },
  brandSection: { 
    marginBottom: SPACING.md,
  },
  brandLogo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  brandIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '900', 
    letterSpacing: 0.5,
    fontFamily: FONTS.bold,
  },
  brandName: { 
    color: '#fff', 
    fontSize: 17, 
    fontWeight: '800', 
    letterSpacing: -0.3,
    fontFamily: FONTS.bold,
  },
  brandSubtitle: { 
    color: 'rgba(255,255,255,0.5)', 
    fontSize: 9, 
    fontWeight: '600', 
    letterSpacing: 0.5, 
    marginTop: 1,
    fontFamily: FONTS.medium,
  },

  divider: { 
    height: 1, 
    backgroundColor: 'rgba(255,255,255,0.06)', 
    marginBottom: SPACING.md,
  },

  userSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '900',
    fontFamily: FONTS.bold,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userInfo: { 
    flex: 1,
    gap: 2,
  },
  userName: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '700',
    fontFamily: FONTS.semibold,
    letterSpacing: -0.2,
  },
  userEmail: { 
    color: 'rgba(255,255,255,0.4)', 
    fontSize: 10,
    fontFamily: FONTS.regular,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  roleText: { 
    color: 'rgba(255,255,255,0.5)', 
    fontSize: 8, 
    fontWeight: '700', 
    letterSpacing: 0.8,
    fontFamily: FONTS.semibold,
  },

  // Menu
  menuScroll: {
    flex: 1,
  },
  menuContent: { 
    paddingTop: SPACING.sm, 
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  menuHeading: {
    ...TYPOGRAPHY.overline,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    marginVertical: 1,
    position: 'relative',
  },
  menuItemActive: { 
    backgroundColor: 'rgba(91, 124, 250, 0.06)',
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(90, 107, 124, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconBoxActive: { 
    backgroundColor: 'rgba(91, 124, 250, 0.08)',
  },
  menuLabel: { 
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    fontFamily: FONTS.medium,
  },
  menuLabelActive: { 
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: FONTS.semibold,
  },
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    color: '#fff',
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },
  activeIndicator: {
    width: 2.5,
    height: 20,
    borderRadius: 1.5,
    backgroundColor: COLORS.accent,
  },

  // Footer
  drawerFooter: {
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(212, 90, 90, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 90, 90, 0.1)',
  },
  logoutText: { 
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    fontWeight: '700',
    fontFamily: FONTS.semibold,
  },
  footerVersion: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: FONTS.medium,
  },
});