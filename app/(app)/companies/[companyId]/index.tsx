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
const MUTED = '#94a3b8';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';
const ERROR = '#dc2626';
const GREEN = '#16a34a';

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

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const update = (key: keyof UpdateCompanyPayload, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const handleSave = () => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = 'Company name is required.';
    if (!form.street_address?.trim()) errors.street_address = 'Street address is required.';
    if (!form.city?.trim()) errors.city = 'City is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const cleanedForm: UpdateCompanyPayload = {};
    Object.entries(form).forEach(([key, value]) => {
      if (value === '' || value === undefined) return;
      (cleanedForm as any)[key] = value;
    });

    updateCompany(cleanedForm, {
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
          Alert.alert('Error', err?.response?.data?.error?.message ?? 'Could not update company.');
        }
      },
    });
  };

  const handleCancel = () => {
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
              <TouchableOpacity onPress={() => setIsEditing(true)} hitSlop={10}>
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
            <View style={styles.trnRow}>
              <Text style={styles.trnLabel}>TRN</Text>
              <Text style={styles.trnValue}>{company.trn}</Text>
            </View>
          </View>
          {!company.is_active ? (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
            </View>
          ) : (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>

        {/* ── Fields ── */}
        {isEditing ? (
          <EditFields form={form} update={update} fieldErrors={fieldErrors} />
        ) : (
          <ViewFields company={company} />
        )}

        {/* ── Related sections ── */}
        {!isEditing && (
          <View style={styles.linksGroup}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push(`/companies/${companyId}/members` as any)}
              activeOpacity={0.6}
            >
              <View style={styles.linkLeft}>
                <View style={[styles.linkIconBox, { backgroundColor: '#eff6ff' }]}>
                  <Text style={[styles.linkIconText, { color: '#2563eb' }]}>M</Text>
                </View>
                <Text style={styles.linkText}>Members</Text>
              </View>
              <View style={styles.linkRight}>
                <Text style={styles.linkCount}>{company.member_count}</Text>
                <Text style={styles.linkChevron}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push(`/companies/${companyId}/customers` as any)}
              activeOpacity={0.6}
            >
              <View style={styles.linkLeft}>
                <View style={[styles.linkIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <Text style={[styles.linkIconText, { color: GREEN }]}>C</Text>
                </View>
                <Text style={styles.linkText}>Customers</Text>
              </View>
              <View style={styles.linkRight}>
                <Text style={styles.linkChevron}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
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
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator color={ERROR} />
            ) : (
              <>
                <Text style={styles.deactivateButtonTitle}>Deactivate company</Text>
                <Text style={styles.deactivateButtonSubtitle}>This can be reversed later by an admin</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

// ───────────────────────────────────────────
// View mode — grouped, professional rows
// ───────────────────────────────────────────
function ViewFields({ company }: { company: any }) {
  const groups = [
    {
      title: 'Legal information',
      rows: [
        { label: 'Legal name', value: company.legal_name },
        { label: 'Legal registration ID', value: company.legal_registration_id },
        { label: 'Legal registration type', value: company.legal_registration_type },
        { label: 'VAT group', value: company.is_vat_group ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Address',
      rows: [{ label: 'Full address', value: company.formatted_address }],
    },
    {
      title: 'Contact',
      rows: [
        { label: 'Phone', value: company.phone },
        { label: 'Email', value: company.email },
        { label: 'Website', value: company.website },
      ],
    },
  ];

  return (
    <>
      {groups.map((group) => (
        <View key={group.title} style={styles.card}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.rows.map((row, i) => (
            <View
              key={row.label}
              style={[styles.viewRow, i === group.rows.length - 1 && styles.viewRowLast]}
            >
              <Text style={styles.viewLabel}>{row.label}</Text>
              <Text style={row.value ? styles.viewValue : styles.viewValueEmpty}>
                {row.value || 'Not provided'}
              </Text>
            </View>
          ))}
        </View>
      ))}
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
  content: { padding: 16, paddingBottom: 48 },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },

  headerActionText: { color: '#fff', fontSize: 16, fontWeight: '600', marginRight: 12 },

  // Header card
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 13, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 19, fontWeight: '700' },
  companyName: { fontSize: 17, fontWeight: '700', color: NAVY },
  trnRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, gap: 5 },
  trnLabel: { fontSize: 11, color: MUTED, fontWeight: '600', letterSpacing: 0.3 },
  trnValue: { fontSize: 12.5, color: SLATE, fontWeight: '600', letterSpacing: 0.3 },

  inactiveBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', color: ERROR, letterSpacing: 0.3 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: GREEN },

  // Grouped view card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  viewRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  viewRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  viewLabel: { fontSize: 12.5, color: SLATE, marginBottom: 3, fontWeight: '500' },
  viewValue: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  viewValueEmpty: { fontSize: 14, color: MUTED, fontStyle: 'italic' },

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

  // Related links group (Members / Customers)
  linksGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkDivider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkIconBox: {
    width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  linkIconText: { fontSize: 13, fontWeight: '700' },
  linkText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  linkRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkCount: { fontSize: 13, color: MUTED, fontWeight: '600' },
  linkChevron: { fontSize: 18, color: MUTED },

  // Action buttons
  editActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  cancelButtonText: { color: SLATE, fontSize: 15, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: NAVY },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },

  deactivateButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  deactivateButtonTitle: { color: ERROR, fontSize: 15, fontWeight: '700' },
  deactivateButtonSubtitle: { color: '#f87171', fontSize: 12, fontWeight: '500', marginTop: 3 },

  errorTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 16 },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});