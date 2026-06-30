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
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  useFraudAlert,
  useAnalyzeFraud,
  useResolveFraud,
  useEvaluateWorkflow,
} from '../../../../src/hooks/useInvoices';
import type { FraudRiskLevel, WorkflowResult } from '../../../../src/types/invoice.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';

const RISK: Record<FraudRiskLevel, { label: string; fg: string; bg: string; border: string }> = {
  low: { label: 'Low Risk', fg: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  medium: { label: 'Medium Risk', fg: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  high: { label: 'High Risk', fg: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
};

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
    setWorkflowResult(null);
    try {
      const res = await workflow.mutateAsync();
      setWorkflowResult(res);
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.error?.message ?? 'Could not run the workflow.');
    }
  }

  async function runAnalysis() {
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
      setResolveOpen(false);
      setResolveNote('');
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.error?.message ?? 'Could not resolve the alert.');
    }
  }

  const risk = alert ? RISK[alert.risk_level] ?? RISK.low : null;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'AI Risk & Workflow' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Workflow ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workflow Decision</Text>
          <Text style={styles.cardSub}>Run the AI workflow engine to get a recommended action.</Text>

          {workflowResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Recommended action</Text>
              <Text style={styles.resultAction}>{workflowResult.action ?? '—'}</Text>
              {workflowResult.reason ? (
                <Text style={styles.resultReason}>{workflowResult.reason}</Text>
              ) : null}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, workflow.isPending && { opacity: 0.6 }]}
            onPress={runWorkflow}
            disabled={workflow.isPending}
          >
            {workflow.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="cpu" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Run Workflow Decision</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Fraud ── */}
        <View style={styles.card}>
          <View style={styles.fraudHead}>
            <Text style={styles.cardTitle}>Fraud Analysis</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Feather name="refresh-cw" size={16} color={SLATE} />
            </TouchableOpacity>
          </View>

          {isLoading || isRefetching ? (
            <View style={styles.center}>
              <ActivityIndicator color={NAVY} />
            </View>
          ) : !alert ? (
            <View style={styles.center}>
              <Feather name="shield" size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <Text style={styles.muted}>No fraud analysis yet.</Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 14 }, analyze.isPending && { opacity: 0.6 }]}
                onPress={runAnalysis}
                disabled={analyze.isPending}
              >
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
              {/* Risk banner */}
              <View style={[styles.riskBanner, { backgroundColor: risk!.bg, borderColor: risk!.border }]}>
                <View>
                  <Text style={[styles.riskLevel, { color: risk!.fg }]}>{risk!.label}</Text>
                  <Text style={styles.riskScore}>
                    Risk score: {Math.round((alert.risk_score ?? 0) * 100)}%
                  </Text>
                </View>
                {alert.is_resolved ? (
                  <View style={styles.resolvedTag}>
                    <Feather name="check" size={12} color="#166534" />
                    <Text style={styles.resolvedTagText}>Resolved</Text>
                  </View>
                ) : (
                  <Text style={[styles.autoAction, { color: risk!.fg }]}>{alert.auto_action}</Text>
                )}
              </View>

              {/* Flags */}
              {Array.isArray(alert.flags_json) && alert.flags_json.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.sectionLabel}>FLAGS</Text>
                  {alert.flags_json.map((f, i) => (
                    <View key={i} style={styles.flagRow}>
                      <Feather name="alert-triangle" size={14} color="#d97706" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.flagDesc}>{f.description || f.code}</Text>
                        {f.severity ? <Text style={styles.flagMeta}>Severity: {f.severity}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* AI explanation */}
              {alert.ai_explanation ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.sectionLabel}>AI EXPLANATION</Text>
                  <Text style={styles.explanation}>{alert.ai_explanation}</Text>
                </View>
              ) : null}

              {/* Duplicates */}
              {Array.isArray(alert.duplicate_invoice_ids) && alert.duplicate_invoice_ids.length > 0 && (
                <Text style={styles.duplicates}>
                  {alert.duplicate_invoice_ids.length} possible duplicate invoice(s) detected.
                </Text>
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
                <TouchableOpacity
                  style={[styles.resolveBtn]}
                  onPress={() => {
                    setResolveNote('');
                    setResolveOpen(true);
                  }}
                >
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

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  cardSub: { fontSize: 13, color: SLATE, marginTop: 4 },

  fraudHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  resultBox: { backgroundColor: '#eef2f8', borderRadius: 12, padding: 14, marginTop: 14 },
  resultLabel: { fontSize: 11, color: SLATE, fontWeight: '700', letterSpacing: 0.5 },
  resultAction: { fontSize: 18, fontWeight: '800', color: NAVY, marginTop: 4, textTransform: 'capitalize' },
  resultReason: { fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 18 },

  muted: { fontSize: 14, color: SLATE },

  riskBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 14,
  },
  riskLevel: { fontSize: 16, fontWeight: '800' },
  riskScore: { fontSize: 13, color: SLATE, marginTop: 2 },
  autoAction: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  resolvedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  resolvedTagText: { fontSize: 11, color: '#166534', fontWeight: '700' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8 },
  flagRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  flagDesc: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  flagMeta: { fontSize: 12, color: SLATE, marginTop: 2 },

  explanation: { fontSize: 13, color: '#334155', lineHeight: 19 },
  duplicates: { fontSize: 13, color: '#be123c', fontWeight: '600', marginTop: 14 },

  noteBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: BORDER },
  noteLabel: { fontSize: 11, color: SLATE, fontWeight: '700' },
  noteText: { fontSize: 13, color: '#334155', marginTop: 4 },

  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: NAVY, borderRadius: 12, paddingVertical: 13, marginTop: 16,
  },
  resolveBtnText: { color: NAVY, fontWeight: '700', fontSize: 14 },

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
