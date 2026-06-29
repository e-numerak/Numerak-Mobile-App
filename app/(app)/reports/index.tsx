import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useVatRates, useCalculateVat } from '../../../src/hooks/useTaxes';
import type { VatRateType, VatCalculateResult } from '../../../src/types/tax.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const GREEN = '#16a34a';

export default function VatCalculatorScreen() {
  const { data: rates, isLoading: ratesLoading } = useVatRates();
  const { mutate: calculate, isPending, data: result } = useCalculateVat();

  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [rateType, setRateType] = useState<VatRateType>('standard');
  const [error, setError] = useState('');

  const handleCalculate = () => {
    setError('');
    if (!amount.trim() || isNaN(Number(amount))) {
      setError('Enter a valid amount.');
      return;
    }
    calculate({
      amount: Number(amount).toFixed(4),
      vat_rate_type: rateType,
      quantity: quantity.trim() ? Number(quantity).toFixed(4) : '1.0000',
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>VAT Calculator</Text>
      <Text style={styles.subtitle}>Quickly estimate VAT for any amount</Text>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Net amount (AED)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 1000.00"
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
        />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Quantity</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="1"
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
        />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>VAT rate type</Text>
        {ratesLoading ? (
          <ActivityIndicator color={NAVY} style={{ marginTop: 8 }} />
        ) : (
          <View style={styles.chipsWrap}>
            {(rates ?? []).map((r) => (
              <TouchableOpacity
                key={r.code}
                style={[styles.chip, rateType === r.code && styles.chipActive]}
                onPress={() => setRateType(r.code)}
              >
                <Text style={[styles.chipText, rateType === r.code && styles.chipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.calcButton, isPending && styles.disabledButton]}
          onPress={handleCalculate}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.calcButtonText}>Calculate</Text>
          )}
        </TouchableOpacity>
      </View>

      {result && <ResultCard result={result} />}
    </ScrollView>
  );
}

function ResultCard({ result }: { result: VatCalculateResult }) {
  const rows = [
    { label: 'Subtotal', value: `${result.currency} ${result.subtotal}` },
    { label: 'VAT rate', value: `${result.vat_rate}%` },
    { label: 'VAT amount', value: `${result.currency} ${result.vat_amount}` },
  ];

  return (
    <View style={styles.resultCard}>
      {rows.map((row) => (
        <View key={row.label} style={styles.resultRow}>
          <Text style={styles.resultLabel}>{row.label}</Text>
          <Text style={styles.resultValue}>{row.value}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{result.currency} {result.total_amount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48 },

  title: { fontSize: 22, fontWeight: '700', color: NAVY },
  subtitle: { fontSize: 14, color: SLATE, marginTop: 4, marginBottom: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  errorText: { fontSize: 12, color: '#dc2626', marginTop: 8 },

  calcButton: {
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  disabledButton: { opacity: 0.6 },
  calcButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  resultLabel: { fontSize: 14, color: SLATE },
  resultValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 14, marginTop: 6, borderTopWidth: 1, borderTopColor: BORDER,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: NAVY },
  totalValue: { fontSize: 18, fontWeight: '800', color: GREEN },
});