import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, G } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────
// NumerakLogo — a crisp vector recreation of the brand mark:
// a blue-gradient "M" with ledger bars, plus the NUMERAK wordmark
// and optional tagline. Scales to any size without pixelation.
// ─────────────────────────────────────────────────────────────
export function NumerakMark({ size = 84 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="numMark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5b8def" />
          <Stop offset="0.55" stopColor="#2f6fed" />
          <Stop offset="1" stopColor="#1e50c7" />
        </LinearGradient>
        <LinearGradient id="numBadge" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#132a4d" />
          <Stop offset="1" stopColor="#0a1a33" />
        </LinearGradient>
      </Defs>

      {/* Rounded badge */}
      <Rect x="2" y="2" width="116" height="116" rx="28" fill="url(#numBadge)" />
      <Rect x="2" y="2" width="116" height="116" rx="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />

      {/* Stylised N */}
      <Path
        d="M28 90 L28 32 L46 32 L74 74 L74 32 L92 32 L92 90 L74 90 L46 48 L46 90 Z"
        fill="url(#numMark)"
      />

      {/* Ledger bars echoing the wordmark's texture */}
      <G opacity={0.85}>
        <Rect x="50" y="60" width="3.4" height="16" rx="1.7" fill="#bcd2ff" />
        <Rect x="57" y="66" width="3.4" height="10" rx="1.7" fill="#bcd2ff" />
      </G>
    </Svg>
  );
}

export function NumerakLogo({
  size = 84,
  tagline = 'Smart billing. Seamless business.',
  showWordmark = true,
}: {
  size?: number;
  tagline?: string | null;
  showWordmark?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <NumerakMark size={size} />
      {showWordmark && (
        <Text style={styles.wordmark}>
          E-<Text style={styles.wordmarkAccent}>N</Text>umerak
        </Text>
      )}
      {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  wordmark: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  wordmarkAccent: { color: '#5b8def' },
  tagline: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
});
