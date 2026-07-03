import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';

// ─────────────────────────────────────────────────────────────
// Skeleton — a single shimmering placeholder block.
// ─────────────────────────────────────────────────────────────
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: number | `${number}%` | 'auto';
  height?: number;
  radius?: number;
  style?: object;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: '#e2e8f0', opacity: pulse },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Shimmer — a placeholder block with a light sweep moving across it.
// Same API as <Skeleton/> but with a true shimmer highlight.
// ─────────────────────────────────────────────────────────────
export function Shimmer({
  width = '100%',
  height = 14,
  radius = 8,
  base = '#e2e8f0',
  highlight = 'rgba(255,255,255,0.65)',
  style,
}: {
  width?: number | `${number}%` | 'auto';
  height?: number;
  radius?: number;
  base?: string;
  highlight?: string;
  style?: object;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: [-w, w],
  });

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: radius, backgroundColor: base, overflow: 'hidden' },
        style,
      ]}
    >
      {w > 0 && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
        >
          <LinearGradient
            colors={['transparent', highlight, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// A card-shaped skeleton row (matches list cards across the app).
// ─────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Skeleton width="55%" height={16} />
        <Skeleton width={70} height={16} />
      </View>
      <Skeleton width="40%" height={12} style={{ marginTop: 12 }} />
      <View style={[styles.cardRow, { marginTop: 14 }]}>
        <Skeleton width="35%" height={12} />
        <Skeleton width={80} height={22} radius={999} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// A full-screen skeleton list (use while a list is loading).
// ─────────────────────────────────────────────────────────────
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Branded full-screen loader — dark corporate gradient background
// with a rotating gradient ring + pulsing glow around the logo.
// ─────────────────────────────────────────────────────────────
const RING = 100;
const STROKE = 5;
const RING_R = (RING - STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    spinLoop.start();
    pulseLoop.start();
    return () => { spinLoop.stop(); pulseLoop.stop(); };
  }, [spin, pulse, enter]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const enterScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <LinearGradient
      colors={['#0f2444', '#12294a', '#0a1728']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.darkScreen}
    >
      {/* soft ambient accents */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      <Animated.View style={{ opacity: enter, transform: [{ scale: enterScale }], alignItems: 'center' }}>
        <View style={styles.ringWrap}>
          {/* pulsing glow */}
          <Animated.View style={[styles.loaderGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

          {/* rotating gradient ring */}
          <Animated.View style={[styles.ringAbsolute, { transform: [{ rotate }] }]}>
            <Svg width={RING} height={RING}>
              <Defs>
                <SvgGradient id="loaderRing" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#7aa8ff" stopOpacity="1" />
                  <Stop offset="1" stopColor="#2f6fed" stopOpacity="0" />
                </SvgGradient>
              </Defs>
              <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} fill="none" />
              <Circle
                cx={RING / 2} cy={RING / 2} r={RING_R}
                stroke="url(#loaderRing)" strokeWidth={STROKE} strokeLinecap="round" fill="none"
                strokeDasharray={`${RING_C * 0.3} ${RING_C * 0.7}`}
              />
            </Svg>
          </Animated.View>

          {/* logo badge */}
          <LinearGradient
            colors={['#3b82f6', '#2563eb', '#1d4ed8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loaderBadge}
          >
            <Text style={styles.loaderBadgeText}>EN</Text>
          </LinearGradient>
        </View>

        <Text style={styles.loaderLabel}>{label}</Text>
        <Text style={styles.loaderBrand}>E-NUMERAK</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8edf3',
    padding: 14, marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fb' },
  brandDot: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  brandDotText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  label: { fontSize: 13, color: SLATE, fontWeight: '600' },

  // Premium dark loader
  darkScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ambientTop: {
    position: 'absolute', top: -90, right: -70, width: 240, height: 240,
    borderRadius: 120, backgroundColor: 'rgba(91,141,239,0.14)',
  },
  ambientBottom: {
    position: 'absolute', bottom: -110, left: -80, width: 260, height: 260,
    borderRadius: 130, backgroundColor: 'rgba(37,99,235,0.10)',
  },
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringAbsolute: { position: 'absolute' },
  loaderGlow: {
    position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: '#3b82f6',
  },
  loaderBadge: {
    width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
  },
  loaderBadgeText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  loaderLabel: { fontSize: 14, color: '#dbe4f0', fontWeight: '600', marginTop: 24 },
  loaderBrand: { fontSize: 11, color: 'rgba(147,197,253,0.65)', fontWeight: '800', letterSpacing: 3, marginTop: 6 },
});
