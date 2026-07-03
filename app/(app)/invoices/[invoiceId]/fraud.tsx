import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  useFraudAlert,
  useAnalyzeFraud,
  useResolveFraud,
  useEvaluateWorkflow,
} from '../../../../src/hooks/useInvoices';
import type { FraudRiskLevel, WorkflowResult } from '../../../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const INK = '#0a2540';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';

const RISK: Record<FraudRiskLevel, { label: string; fg: string; bg: string; border: string; ring: string }> = {
  low: { label: 'Low Risk', fg: '#166534', bg: '#f0fdf4', border: '#bbf7d0', ring: '#16a34a' },
  medium: { label: 'Medium Risk', fg: '#92400e', bg: '#fffbeb', border: '#fde68a', ring: '#d97706' },
  high: { label: 'High Risk', fg: '#be123c', bg: '#fff1f2', border: '#fecdd3', ring: '#e11d48' },
};

// Circular risk gauge (SVG ring + centered %)
function RiskGauge({ pct, color }: { pct: number; color: string }) {
  const size = 128;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circ * (1 - clamped / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#eef2f7" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.gaugePct, { color }]}>{Math.round(clamped)}%</Text>
      <Text style={styles.gaugeSub}>risk score</Text>
    </View>
  );
}

export default function FraudWorkflowScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const insets = useSafeAreaInsets();

  const { data: alert, isLoading, refetch, isRefetching } = useFraudAlert(invoiceId);
  const analyze = useAnalyzeFraud(invoiceId);
  const resolve = useResolveFraud(invoiceId);
  const workflow = useEvaluateWorkflow(invoiceId);

  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  async function runWorkflow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setWorkflowResult(null);
    try {
      const res = await workflow.mutateAsync();
      setWorkflowResult(res);
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.error?.message ?? 'Could not run the workflow.');
    }
  }

  async function runAnalysis() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await analyze.mutateAsync();
      Alert.alert('Analysis queued', 'Fraud analysis is running. Pull to refresh in a few seconds.');
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.error?.message ?? 'Could not start analysis.');
    }
  }

  async function submitResolve() {
    try {
      await resolve.mutateAsync({ resolution_note: resolveNote.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResolveOpen(false);
      setResolveNote('');
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.error?.message ?? 'Could not resolve the alert.');
    }
  }

  const risk = alert ? RISK[alert.risk_level] ?? RISK.low : null;
  const scorePct = Math.round((alert?.risk_score ?? 0) * 100);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'AI Risk & Workflow' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} colors={[NAVY]} />}
      >
        {/* ── Hero ── */}
        <LinearGradient colors={[INK, '#0d3260', '#071828']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="shield" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>AI Risk &amp; Workflow</Text>
            <Text style={styles.heroSub}>Automated fraud screening and recommended actions for this invoice.</Text>
          </View>
        </LinearGradient>

        {/* ── Workflow ── */}
        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <View style={[styles.cardHeadIcon, { backgroundColor: '#eef2ff' }]}>
              <Feather name="cpu" size={16} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Workflow Decision</Text>
              <Text style={styles.cardSub}>Run the AI engine to get a recommended action.</Text>
            </View>
          </View>

          {workflowResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>RECOMMENDED ACTION</Text>
              <Text style={styles.resultAction}>{workflowResult.action ?? '—'}</Text>
              {workflowResult.reason ? <Text style={styles.resultReason}>{workflowResult.reason}</Text> : null}
            </View>
          )}

          <TouchableOpacity style={[styles.primaryBtn, workflow.isPending && { opacity: 0.6 }]} onPress={runWorkflow} disabled={workflow.isPending} activeOpacity={0.9}>
            <LinearGradient colors={['#4f46e5', '#4338ca']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
              {workflow.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="cpu" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Run Workflow Decision</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Fraud ── */}
        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <View style={[styles.cardHeadIcon, { backgroundColor: '#fff1f2' }]}>
              <Feather name="alert-octagon" size={16} color="#e11d48" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Fraud Analysis</Text>
              <Text style={styles.cardSub}>AI screening across duplicates, anomalies & patterns.</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.center}><ActivityIndicator color={NAVY} /></View>
          ) : !alert ? (
            <View style={styles.center}>
              <Feather name="shield" size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <Text style={styles.muted}>No fraud analysis yet.</Text>
              <TouchableOpacity style={[styles.analyzeBtn, analyze.isPending && { opacity: 0.6 }]} onPress={runAnalysis} disabled={analyze.isPending} activeOpacity={0.9}>
                {analyze.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="search" size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>Run Analysis</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Gauge + risk level */}
              <View style={[styles.riskCard, { backgroundColor: risk!.bg, borderColor: risk!.border }]}>
                <RiskGauge pct={scorePct} color={risk!.ring} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={[styles.riskChip, { backgroundColor: '#fff' }]}>
                    <View style={[styles.riskDot, { backgroundColor: risk!.ring }]} />
                    <Text style={[styles.riskLevel, { color: risk!.fg }]}>{risk!.label}</Text>
                  </View>
                  {alert.is_resolved ? (
                    <View style={styles.resolvedTag}>
                      <Feather name="check" size={12} color="#166534" />
                      <Text style={styles.resolvedTagText}>Resolved</Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.autoActionLabel}>Auto action</Text>
                      <Text style={[styles.autoAction, { color: risk!.fg }]}>{alert.auto_action}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Flags */}
              {Array.isArray(alert.flags_json) && alert.flags_json.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.sectionLabel}>FLAGS ({alert.flags_json.length})</Text>
                  {alert.flags_json.map((f, i) => (
                    <View key={i} style={styles.flagCard}>
                      <View style={styles.flagIcon}>
                        <Feather name="alert-triangle" size={14} color="#d97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.flagDesc}>{f.description || f.code}</Text>
                        {f.severity ? (
                          <View style={styles.severityChip}>
                            <Text style={styles.severityText}>Severity: {f.severity}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* AI explanation */}
              {alert.ai_explanation ? (
                <View style={styles.explBox}>
                  <View style={styles.explHead}>
                    <Feather name="zap" size={13} color="#4f46e5" />
                    <Text style={styles.sectionLabel}>AI EXPLANATION</Text>
                  </View>
                  <Text style={styles.explanation}>{alert.ai_explanation}</Text>
                </View>
              ) : null}

              {/* Duplicates */}
              {Array.isArray(alert.duplicate_invoice_ids) && alert.duplicate_invoice_ids.length > 0 && (
                <View style={styles.dupRow}>
                  <Feather name="copy" size={14} color="#be123c" />
                  <Text style={styles.duplicates}>
                    {alert.duplicate_invoice_ids.length} possible duplicate invoice(s) detected.
                  </Text>
                </View>
              )}

              {/* Resolution */}
              {alert.is_resolved ? (
                alert.resolution_note ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>Resolution note</Text>
                    <Text style={styles.noteText}>{alert.resolution_note}</Text>
                  </View>
                ) : null
              ) : (
                <TouchableOpacity style={styles.resolveBtn} onPress={() => { setResolveNote(''); setResolveOpen(true); }}>
                  <Feather name="check-circle" size={16} color={NAVY} />
                  <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Resolve modal */}
      <Modal visible={resolveOpen} transparent animationType="slide" onRequestClose={() => setResolveOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setResolveOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Resolve fraud alert</Text>
            <Text style={styles.cardSub}>Add an optional note explaining the resolution.</Text>
            <TextInput
              style={styles.noteInput}
              value={resolveNote}
              onChangeText={setResolveNote}
              placeholder="Resolution note (optional)…"
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setResolveOpen(false)} disabled={resolve.isPending}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, resolve.isPending && { opacity: 0.6 }]} onPress={submitResolve} disabled={resolve.isPending}>
                {resolve.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Resolve</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },

  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: INK, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  heroIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  heroSub: { fontSize: 12.5, color: '#cbd5e1', marginTop: 3, lineHeight: 17 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardHeadIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  cardSub: { fontSize: 12.5, color: SLATE, marginTop: 2 },

  primaryBtn: { borderRadius: 12, marginTop: 16, overflow: 'hidden' },
  primaryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14, marginTop: 14, paddingHorizontal: 24,
  },

  resultBox: { backgroundColor: '#eef2ff', borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#e0e7ff' },
  resultLabel: { fontSize: 10.5, color: '#6366f1', fontWeight: '800', letterSpacing: 0.8 },
  resultAction: { fontSize: 18, fontWeight: '900', color: '#3730a3', marginTop: 4, textTransform: 'capitalize' },
  resultReason: { fontSize: 13, color: '#4338ca', marginTop: 4, lineHeight: 18 },

  muted: { fontSize: 14, color: SLATE },

  // Risk card with gauge
  riskCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 14, padding: 16, borderWidth: 1, marginTop: 14 },
  gaugePct: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  gaugeSub: { fontSize: 10, color: SLATE, fontWeight: '700', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  riskChip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskLevel: { fontSize: 14, fontWeight: '800' },
  autoActionLabel: { fontSize: 10.5, color: SLATE, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  autoAction: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  resolvedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  resolvedTagText: { fontSize: 11, color: '#166534', fontWeight: '700' },

  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8 },
  flagCard: { flexDirection: 'row', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 12, marginBottom: 8 },
  flagIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  flagDesc: { fontSize: 13.5, color: '#1e293b', fontWeight: '700' },
  severityChip: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 },
  severityText: { fontSize: 11, color: '#92400e', fontWeight: '700' },

  explBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: BORDER },
  explHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  explanation: { fontSize: 13, color: '#334155', lineHeight: 19 },

  dupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  duplicates: { fontSize: 13, color: '#be123c', fontWeight: '700', flex: 1 },

  noteBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: BORDER },
  noteLabel: { fontSize: 11, color: SLATE, fontWeight: '700' },
  noteText: { fontSize: 13, color: '#334155', marginTop: 4 },

  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: NAVY, borderRadius: 12, paddingVertical: 13, marginTop: 16,
  },
  resolveBtnText: { color: NAVY, fontWeight: '800', fontSize: 14 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: NAVY },
  noteInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, backgroundColor: '#f9fafc', color: '#0f172a', minHeight: 90, textAlignVertical: 'top', marginTop: 12,
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  cancelText: { color: SLATE, fontWeight: '700', fontSize: 14 },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: NAVY },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
