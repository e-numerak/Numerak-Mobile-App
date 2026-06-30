import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '../../../../../../src/hooks/useCustomers';
import type { CustomerType, UpdateCustomerPayload } from '../../../../../../src/types/customer.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';
const GREEN = '#16a34a';
const AMBER = '#d97706';

const CUSTOMER_TYPES: { label: string; value: CustomerType }[] = [
  { label: 'B2B (Business)', value: 'b2b' },
  { label: 'B2G (Government)', value: 'b2g' },
  { label: 'B2C (Consumer)', value: 'b2c' },
];

export default function CustomerDetailScreen() {
  const { companyId, customerId } = useLocalSearchParams<{ companyId: string; customerId: string }>();
  const router = useRouter();

  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId);
  const { mutate: updateCustomer, isPending: isSaving } = useUpdateCustomer(customerId, companyId);
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer(companyId);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<UpdateCustomerPayload>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        legal_name: customer.legal_name,
        customer_type: customer.customer_type,
        trn: customer.trn,
        vat_number: customer.vat_number,
        peppol_endpoint: customer.peppol_endpoint,
        street_address: customer.street_address,
        city: customer.city,
        state_province: customer.state_province,
        postal_code: customer.postal_code,
        country: customer.country,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
      });
    }
  }, [customer]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const update = (key: keyof UpdateCustomerPayload, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const handleSave = () => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = 'Customer name is required.';

    const isUae = (form.country ?? 'AE').toUpperCase() === 'AE';
    const isB2bOrB2g = form.customer_type === 'b2b' || form.customer_type === 'b2g';
    if (isUae && isB2bOrB2g && !form.trn?.trim()) {
      errors.trn = 'UAE B2B/B2G customers must have a TRN.';
    }
    if (form.trn?.trim() && !/^\d{15}$/.test(form.trn.trim())) {
      errors.trn = 'TRN must be exactly 15 digits.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Strip blank optional strings — backend rejects present-but-blank fields
    const cleanedForm: UpdateCustomerPayload = {};
    Object.entries(form).forEach(([key, value]) => {
      if (value === '' || value === undefined) return;
      (cleanedForm as any)[key] = value;
    });

    updateCustomer(cleanedForm, {
      onSuccess: () => setIsEditing(false),
      onError: (err: any) => {
        const details = err?.response?.data?.error?.details;
        if (details && typeof details === 'object') {
          const flattened: Record<string, string> = {};
          Object.entries(details).forEach(([key, val]) => {
            flattened[key] = Array.isArray(val) ? val[0] : String(val);
          });
          setFieldErrors(flattened);
        } else {
          Alert.alert('Error', err?.response?.data?.error?.message ?? 'Could not update customer.');
        }
      },
    });
  };

  const handleCancel = () => {
    if (customer) {
      setForm({
        name: customer.name,
        legal_name: customer.legal_name,
        customer_type: customer.customer_type,
        trn: customer.trn,
        vat_number: customer.vat_number,
        peppol_endpoint: customer.peppol_endpoint,
        street_address: customer.street_address,
        city: customer.city,
        state_province: customer.state_province,
        postal_code: customer.postal_code,
        country: customer.country,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
      });
    }
    setFieldErrors({});
    setIsEditing(false);
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate customer?',
      `"${customer?.name}" will be deactivated and hidden from this company's customer list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            deleteCustomer(customerId, {
              onSuccess: () => router.replace(`/companies/${companyId}/customers` as any),
              onError: () => Alert.alert('Error', 'Could not deactivate customer.'),
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (isError || !customer) {
    return (
      <View style={styles.centerScreen}>
        <Feather name="alert-triangle" size={44} color={ERROR} style={{ marginBottom: 14 }} />
        <Text style={styles.errorTitle}>Couldn't load this customer</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completionColor =
    customer.completion_percent >= 100 ? GREEN : customer.completion_percent >= 50 ? AMBER : ERROR;

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Customer' : customer.name,
          headerRight: () =>
            isEditing ? null : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.headerActionText}>Edit</Text>
              </TouchableOpacity>
            ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* ── Header card ── */}
        <View style={styles.headerCard}>
          {customer.logo ? (
            <Image source={{ uri: customer.logo }} style={styles.logoImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{customer.name?.[0]?.toUpperCase() ?? 'C'}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerType}>{customer.customer_type_display}</Text>
          </View>
          {!customer.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
            </View>
          )}
        </View>

        {/* ── Completeness progress ── */}
        {!isEditing && (
          <View
            style={[
              styles.completenessCard,
              { backgroundColor: `${completionColor}10`, borderColor: `${completionColor}33` },
            ]}
          >
            <View style={styles.completenessTop}>
              <View style={styles.completenessTitleRow}>
                <Feather
                  name={customer.is_complete ? 'check-circle' : 'alert-circle'}
                  size={16}
                  color={completionColor}
                />
                <Text style={[styles.completenessTitle, { color: completionColor }]}>
                  {customer.is_complete ? 'Profile complete — ready to invoice' : 'Profile incomplete'}
                </Text>
              </View>
              <Text style={[styles.completenessPercent, { color: completionColor }]}>
                {customer.completion_percent}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${customer.completion_percent}%`, backgroundColor: completionColor },
                ]}
              />
            </View>
            {!customer.is_complete && customer.missing_fields?.length > 0 && (
              <Text style={styles.completenessLabel}>
                Missing: {customer.missing_fields.join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* ── Fields ── */}
        {isEditing ? (
          <EditFields form={form} update={update} fieldErrors={fieldErrors} />
        ) : (
          <ViewFields customer={customer} />
        )}

        {/* ── Action buttons ── */}
        {isEditing ? (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={isSaving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.deactivateButton, isDeleting && styles.disabledButton]}
            onPress={handleDeactivate}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color={ERROR} />
            ) : (
              <Text style={styles.deactivateButtonText}>Deactivate customer</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

// ───────────────────────────────────────────
// View mode
// ───────────────────────────────────────────
function ViewFields({ customer }: { customer: any }) {
  const rows = [
    { label: 'Legal name', value: customer.legal_name },
    { label: 'TRN', value: customer.trn },
    { label: 'TRN issued', value: customer.trn_issue_date },
    { label: 'TRN expiry', value: customer.trn_expiry_date },
    { label: 'VAT number', value: customer.vat_number },
    { label: 'PEPPOL endpoint', value: customer.peppol_endpoint },
    { label: 'Address', value: customer.formatted_address },
    { label: 'Email', value: customer.email },
    { label: 'Phone', value: customer.phone },
    { label: 'Notes', value: customer.notes },
  ];

  const openUrl = (url?: string | null) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <>
      <View style={styles.card}>
        {rows.map((row) => (
          <View key={row.label} style={styles.viewRow}>
            <Text style={styles.viewLabel}>{row.label}</Text>
            <Text style={styles.viewValue}>{row.value || '—'}</Text>
          </View>
        ))}
      </View>

      {(customer.trn_document || customer.logo) && (
        <View style={styles.docsRow}>
          {customer.trn_document && (
            <TouchableOpacity style={styles.docLink} onPress={() => openUrl(customer.trn_document)}>
              <Feather name="external-link" size={15} color="#2563eb" />
              <Text style={styles.docLinkText}>View TRN document</Text>
            </TouchableOpacity>
          )}
          {customer.logo && (
            <TouchableOpacity style={styles.docLink} onPress={() => openUrl(customer.logo)}>
              <Feather name="external-link" size={15} color="#2563eb" />
              <Text style={styles.docLinkText}>View logo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

// ───────────────────────────────────────────
// Edit mode
// ───────────────────────────────────────────
function EditFields({
  form,
  update,
  fieldErrors,
}: {
  form: UpdateCustomerPayload;
  update: (key: keyof UpdateCustomerPayload, value: any) => void;
  fieldErrors: Record<string, string>;
}) {
  return (
    <View style={styles.card}>
      <Field label="Customer name" required value={form.name} onChangeText={(v: string) => update('name', v)} error={fieldErrors.name} />
      <Field label="Legal name" value={form.legal_name} onChangeText={(v: string) => update('legal_name', v)} />

      <Text style={styles.fieldLabel}>Customer type</Text>
      <View style={styles.chipsWrap}>
        {CUSTOMER_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, form.customer_type === t.value && styles.chipActive]}
            onPress={() => update('customer_type', t.value)}
          >
            <Text style={[styles.chipText, form.customer_type === t.value && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="TRN" value={form.trn} onChangeText={(v: string) => update('trn', v)} error={fieldErrors.trn} keyboardType="number-pad" maxLength={15} />
      <Field label="VAT number" value={form.vat_number} onChangeText={(v: string) => update('vat_number', v)} />
      <Field label="Street address" value={form.street_address} onChangeText={(v: string) => update('street_address', v)} />
      <Field label="City" value={form.city} onChangeText={(v: string) => update('city', v)} />
      <Field label="State / Province" value={form.state_province} onChangeText={(v: string) => update('state_province', v)} />
      <Field label="Postal code" value={form.postal_code} onChangeText={(v: string) => update('postal_code', v)} />
      <Field label="Country" value={form.country} onChangeText={(v: string) => update('country', v.toUpperCase())} maxLength={2} autoCapitalize="characters" />
      <Field label="Email" value={form.email} onChangeText={(v: string) => update('email', v)} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Phone" value={form.phone} onChangeText={(v: string) => update('phone', v)} keyboardType="phone-pad" />
      <Field label="PEPPOL endpoint" value={form.peppol_endpoint} onChangeText={(v: string) => update('peppol_endpoint', v)} />
      <Field label="Notes" value={form.notes} onChangeText={(v: string) => update('notes', v)} multiline />

      <View style={styles.noticeBox}>
        <Feather name="info" size={15} color="#1d4ed8" style={{ marginTop: 1 }} />
        <Text style={styles.noticeText}>
          Logo and TRN document cannot be changed here. Deactivate and re-add the customer if you need to update them.
        </Text>
      </View>
    </View>
  );
}

function Field({ label, required, error, ...inputProps }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.requiredStar}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor="#94a3b8"
        value={inputProps.value ?? ''}
        {...inputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48 },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },

  headerActionText: { color: '#fff', fontSize: 16, fontWeight: '700', marginRight: 12 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  logoImage: { width: 52, height: 52, borderRadius: 14, marginRight: 14 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  customerName: { fontSize: 17, fontWeight: '700', color: NAVY },
  customerType: { fontSize: 12, color: SLATE, marginTop: 2 },
  inactiveBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', color: ERROR },

  completenessCard: {
    borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1,
  },
  completenessTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completenessTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  completenessTitle: { fontSize: 14, fontWeight: '700' },
  completenessPercent: { fontSize: 15, fontWeight: '800' },
  completenessLabel: { fontSize: 12, color: SLATE, marginTop: 8 },
  progressTrack: {
    height: 8, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.08)', marginTop: 10, overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 999 },

  card: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14, borderWidth: 1, borderColor: BORDER },

  viewRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 16,
  },
  viewLabel: { fontSize: 14, color: SLATE },
  viewValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1, textAlign: 'right' },

  docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginBottom: 16, paddingHorizontal: 4 },
  docLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  docLinkText: { fontSize: 14, color: '#2563eb', fontWeight: '700' },

  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  requiredStar: { color: ERROR },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
  },
  inputError: { borderColor: ERROR },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  noticeBox: { flexDirection: 'row', gap: 8, backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginTop: 4 },
  noticeText: { flex: 1, fontSize: 12, color: '#1d4ed8', lineHeight: 18 },

  editActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  cancelButtonText: { color: SLATE, fontSize: 15, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: NAVY },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },

  deactivateButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  deactivateButtonText: { color: ERROR, fontSize: 15, fontWeight: '700' },

  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 16 },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});