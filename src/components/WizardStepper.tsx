import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const GREEN = '#16a34a';
const BORDER = '#e2e8f0';

export type WizardStep = { label: string; sub: string; icon: keyof typeof Feather.glyphMap };

// ─────────────────────────────────────────────────────────────
// WizardStepper — the header used by multi-step forms:
// a progress line with numbered/checked dots, plus the current
// step's icon, title and "Step X of N" sub-line.
// ─────────────────────────────────────────────────────────────
export function WizardStepper({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.stepsWrap}>
        <View style={styles.lineBg} />
        <View style={[styles.lineFill, { width: `${(current / (steps.length - 1)) * 100}%` }]} />
        <View style={styles.stepsRow}>
          {steps.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <View key={s.label} style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                {done ? (
                  <Feather name="check" size={12} color="#fff" />
                ) : (
                  <Text style={[styles.dotNum, active && styles.dotNumActive]}>{i + 1}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.headRow}>
        <View style={styles.headIcon}>
          <Feather name={steps[current].icon} size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headTitle}>{steps[current].label}</Text>
          <Text style={styles.headSub}>Step {current + 1} of {steps.length} · {steps[current].sub}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  stepsWrap: { position: 'relative', justifyContent: 'center', height: 26, marginBottom: 12 },
  lineBg: { position: 'absolute', left: 12, right: 12, height: 2, backgroundColor: '#e2e8f0', top: 12 },
  lineFill: { position: 'absolute', left: 12, height: 2, backgroundColor: GREEN, top: 12 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#f1f5f9',
    borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  dotDone: { backgroundColor: GREEN, borderColor: GREEN },
  dotActive: { backgroundColor: NAVY, borderColor: NAVY },
  dotNum: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  dotNumActive: { color: '#fff' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontSize: 16, fontWeight: '800', color: NAVY },
  headSub: { fontSize: 12, color: SLATE, marginTop: 1 },
});
