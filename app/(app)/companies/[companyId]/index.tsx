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
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  useCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '../../../../src/hooks/useCompanies';
import type { Emirate, LegalRegistrationType, UpdateCompanyPayload } from '../../../../src/types/company.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';

const EMIRATES: { label: string; value: Emirate }[] = [
  { label: 'Dubai', value: 'dubai' },
  { label: 'Abu Dhabi', value: 'abu_dhabi' },
  { label: 'Sharjah', value: 'sharjah' },
  { label: 'Ajman', value: 'ajman' },
  { label: 'Umm Al Quwain', value: 'umm_al_quwain' },
  { label: 'Ras Al Khaimah', value: 'ras_al_khaimah' },
  { label: 'Fujairah', value: 'fujairah' },
];

const LEGAL_REG_TYPES: { label: string; value: LegalRegistrationType }[] = [
  { label: 'Trade License (TL)', value: 'TL' },
  { label: 'Commercial Reg. No. (CRN)', value: 'CRN' },
  { label: 'Emirates ID (EID)', value: 'EID' },
  { label: 'Passport (PAS)', value: 'PAS' },
  { label: 'Commercial Document (CD)', value: 'CD' },
];

export default function CompanyDetailScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();

  const { data: company, isLoading, isError, refetch } = useCompany(companyId);
  const { mutate: updateCompany, isPending: isSaving } = useUpdateCompany(companyId);
  const { mutate: deleteCompany, isPending: isDeleting } = useDeleteCompany();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<UpdateCompanyPayload>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Populate form whenever company data loads (or when entering edit mode)
  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        legal_name: company.legal_name,
        street_address: company.street_address,
        city: company.city,
        emirate: company.emirate,
        po_box: company.po_box,
        country: company.country,
        phone: company.phone,
        email: company.email,
        website: company.website,
        legal_registration_id: company.legal_registration_id,
        legal_registration_type: company.legal_registration_type,
        is_vat_group: company.is_vat_group,
      });
    }
  }, [company]);

  const update = (key: keyof UpdateCompanyPayload, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
  const errors: Record<string, string> = {};
  if (!form.name?.trim()) errors.name = 'Company name is required.';
  if (!form.street_address?.trim()) errors.street_address = 'Street address is required.';
  if (!form.city?.trim()) errors.city = 'City is required.';
  setFieldErrors(errors);
  if (Object.keys(errors).length > 0) return;

  // Strip out empty-string optional fields — backend rejects blank strings
  // for fields like po_box, phone, email, website, legal_registration_id
  // (only "field missing" is allowed, not "field present but blank").
  const cleanedForm: UpdateCompanyPayload = {};
  Object.entries(form).forEach(([key, value]) => {
    if (value === '' || value === undefined) return; // skip blanks
    (cleanedForm as any)[key] = value;
  });

  updateCompany(cleanedForm, {
    onSuccess: () => {
      setIsEditing(false);
    },
    onError: (err: any) => {
      // Backend shape: { success, error: { code, message, details } }
      const details = err?.response?.data?.error?.details;
      if (details && typeof details === 'object') {
        const flattened: Record<string, string> = {};
        Object.entries(details).forEach(([key, val]) => {
          flattened[key] = Array.isArray(val) ? val[0] : String(val);
        });
        setFieldErrors(flattened);
      } else {
        const message = err?.response?.data?.error?.message ?? 'Could not update company.';
        Alert.alert('Error', message);
      }
    },
  });
};

  const handleCancel = () => {
    // Reset form back to original company data
    if (company) {
      setForm({
        name: company.name,
        legal_name: company.legal_name,
        street_address: company.street_address,
        city: company.city,
        emirate: company.emirate,
        po_box: company.po_box,
        country: company.country,
        phone: company.phone,
        email: company.email,
        website: company.website,
        legal_registration_id: company.legal_registration_id,
        legal_registration_type: company.legal_registration_type,
        is_vat_group: company.is_vat_group,
      });
    }
    setFieldErrors({});
    setIsEditing(false);
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate company?',
      `"${company?.name}" will be deactivated and hidden from your companies list. This can be reversed by an admin later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            deleteCompany(companyId, {
              onSuccess: () => router.replace('/companies'),
              onError: () => Alert.alert('Error', 'Could not deactivate company.'),
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

  if (isError || !company) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Couldn't load this company</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Company' : company.name,
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
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{company.name?.[0]?.toUpperCase() ?? 'C'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyTrn}>TRN: {company.trn} (immutable)</Text>
          </View>
          {!company.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
            </View>
          )}
        </View>

        {/* ── Fields ── */}
        {isEditing ? (
          <EditFields form={form} update={update} fieldErrors={fieldErrors} />
        ) : (
          <ViewFields company={company} />
        )}

        {/* ── Members shortcut ── */}
        {!isEditing && (
          <TouchableOpacity
            style={styles.membersLink}
            onPress={() => router.push(`/companies/${companyId}/members` as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.membersLinkText}>👥 View members ({company.member_count})</Text>
            <Text style={styles.membersLinkArrow}>→</Text>
          </TouchableOpacity>
        )}
        
        {/* ── Customers shortcut ── */}
        {!isEditing && (
          <TouchableOpacity
            style={styles.membersLink}
            onPress={() => router.push(`/companies/${companyId}/customers` as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.membersLinkText}>🧑‍💼 View customers</Text>
            <Text style={styles.membersLinkArrow}>›</Text>
          </TouchableOpacity>
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
              <Text style={styles.deactivateButtonText}>Deactivate company</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

// ───────────────────────────────────────────
// View mode — read-only rows
// ───────────────────────────────────────────
function ViewFields({ company }: { company: any }) {
  const rows = [
    { label: 'Legal name', value: company.legal_name || '—' },
    { label: 'Address', value: company.formatted_address || '—' },
    { label: 'Phone', value: company.phone || '—' },
    { label: 'Email', value: company.email || '—' },
    { label: 'Website', value: company.website || '—' },
    { label: 'Legal registration ID', value: company.legal_registration_id || '—' },
    { label: 'Legal registration type', value: company.legal_registration_type || '—' },
    { label: 'VAT group', value: company.is_vat_group ? 'Yes' : 'No' },
    { label: 'PEPPOL endpoint', value: company.peppol_endpoint || '—' },
  ];

  return (
    <View style={styles.card}>
      {rows.map((row) => (
        <View key={row.label} style={styles.viewRow}>
          <Text style={styles.viewLabel}>{row.label}</Text>
          <Text style={styles.viewValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ───────────────────────────────────────────
// Edit mode — editable inputs
// ───────────────────────────────────────────
function EditFields({
  form,
  update,
  fieldErrors,
}: {
  form: UpdateCompanyPayload;
  update: (key: keyof UpdateCompanyPayload, value: any) => void;
  fieldErrors: Record<string, string>;
}) {
  return (
    <View style={styles.card}>
      <Field label="Company name" required value={form.name} onChangeText={(v: string) => update('name', v)} error={fieldErrors.name} />
      <Field label="Legal name" value={form.legal_name} onChangeText={(v: string) => update('legal_name', v)} />
      <Field label="Street address" required value={form.street_address} onChangeText={(v: string) => update('street_address', v)} error={fieldErrors.street_address} />
      <Field label="City" required value={form.city} onChangeText={(v: string) => update('city', v)} error={fieldErrors.city} />

      <Text style={styles.fieldLabel}>Emirate</Text>
      <View style={styles.chipsWrap}>
        {EMIRATES.map((e) => (
          <TouchableOpacity
            key={e.value}
            style={[styles.chip, form.emirate === e.value && styles.chipActive]}
            onPress={() => update('emirate', e.value)}
          >
            <Text style={[styles.chipText, form.emirate === e.value && styles.chipTextActive]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="P.O. Box" value={form.po_box} onChangeText={(v: string) => update('po_box', v)} keyboardType="number-pad" />
      <Field label="Phone" value={form.phone} onChangeText={(v: string) => update('phone', v)} keyboardType="phone-pad" />
      <Field label="Email" value={form.email} onChangeText={(v: string) => update('email', v)} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Website" value={form.website} onChangeText={(v: string) => update('website', v)} autoCapitalize="none" />
      <Field label="Legal registration ID" value={form.legal_registration_id} onChangeText={(v: string) => update('legal_registration_id', v)} />

      <Text style={styles.fieldLabel}>Legal registration type</Text>
      <View style={styles.chipsWrap}>
        {LEGAL_REG_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, form.legal_registration_type === t.value && styles.chipActive]}
            onPress={() => update('legal_registration_type', t.value)}
          >
            <Text style={[styles.chipText, form.legal_registration_type === t.value && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.fieldLabel}>Part of a VAT group?</Text>
        <Switch value={!!form.is_vat_group} onValueChange={(v) => update('is_vat_group', v)} trackColor={{ true: NAVY }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  companyName: { fontSize: 17, fontWeight: '700', color: NAVY },
  companyTrn: { fontSize: 12, color: SLATE, marginTop: 2 },
  inactiveBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', color: ERROR },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  // View mode rows
  viewRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  viewLabel: { fontSize: 12, color: SLATE, marginBottom: 3, fontWeight: '500' },
  viewValue: { fontSize: 15, color: '#1e293b', fontWeight: '500' },

  // Edit mode fields
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

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Members link
  membersLink: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  membersLinkText: { fontSize: 14, fontWeight: '600', color: NAVY },
  membersLinkArrow: { fontSize: 16, color: SLATE },

  // Action buttons
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