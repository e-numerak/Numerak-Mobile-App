import { useEffect, useRef, useState } from 'react';
import { Text, Animated, Easing, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

// ─────────────────────────────────────────────────────────────
// AnimatedNumber — smoothly tweens from the previous value to the
// next whenever `value` changes (count-up effect for metrics).
// ─────────────────────────────────────────────────────────────
export function AnimatedNumber({
  value,
  format,
  style,
  duration = 800,
}: {
  value: number;
  format: (n: number) => string;
  style?: any;
  duration?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const prev = useRef(0);
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    const from = prev.current;
    const to = value;
    anim.setValue(0);
    const id = anim.addListener(({ value: t }) => {
      setDisplay(format(from + (to - from) * t));
    });
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      prev.current = to;
      setDisplay(format(to));
    });
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

// ─────────────────────────────────────────────────────────────
// RefreshSpinner — a custom animated "Refreshing…" banner that
// height-expands and shows a spinning loader while `visible`.
// ─────────────────────────────────────────────────────────────
export function RefreshSpinner({
  visible,
  color = '#1e3a5f',
  label = 'Refreshing…',
}: {
  visible: boolean;
  color?: string;
  label?: string;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const maxH = height.interpolate({ inputRange: [0, 1], outputRange: [0, 38] });

  return (
    <Animated.View style={[styles.bar, { height: maxH, opacity: height }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Feather name="loader" size={15} color={color} />
      </Animated.View>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
