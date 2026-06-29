import { View, Text, StyleSheet } from 'react-native';
import type { InvoiceStatus } from '../types/invoice.types';

// Colors mirror the web InvoiceStatusBadge (Tailwind classes → hex).
// `processing` isn't in the web map; given a sensible indigo here.
const STATUS_COLORS: Record<InvoiceStatus, { bg: string; fg: string }> = {
  draft:          { bg: '#f3f4f6', fg: '#374151' },
  pending:        { bg: '#fef9c3', fg: '#854d0e' },
  processing:     { bg: '#e0e7ff', fg: '#3730a3' },
  submitted:      { bg: '#dbeafe', fg: '#1e40af' },
  validated:      { bg: '#dcfce7', fg: '#166534' },
  rejected:       { bg: '#fee2e2', fg: '#991b1b' },
  cancelled:      { bg: '#e5e7eb', fg: '#4b5563' },
  paid:           { bg: '#d1fae5', fg: '#065f46' },
  partially_paid: { bg: '#ffedd5', fg: '#9a3412' },
  deactivated:    { bg: '#fef3c7', fg: '#92400e' },
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  processing: 'Processing',
  submitted: 'Submitted',
  validated: 'Validated',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  deactivated: 'Deactivated',
};

export function InvoiceStatusBadge({
  status,
  label,
}: {
  status: InvoiceStatus;
  /** Prefer the API's status_display when available. */
  label?: string;
}) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>
        {label ?? STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  text: { fontSize: 11, fontWeight: '600' },
});
