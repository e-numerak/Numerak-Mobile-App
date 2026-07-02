import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
// Branded centered loader — subtle scaling/pulsing dot with label.
// ─────────────────────────────────────────────────────────────
export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.85, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [scale, opacity]);

  return (
    <View style={styles.center}>
      <Animated.View style={[styles.brandDot, { transform: [{ scale }], opacity }]}>
        <Text style={styles.brandDotText}>EN</Text>
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </View>
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
});
