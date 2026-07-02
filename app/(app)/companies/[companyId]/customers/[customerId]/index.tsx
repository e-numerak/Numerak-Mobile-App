import { useState, useEffect, type ReactNode } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '../../../../../../src/hooks/useCustomers';
import { API_BASE_URL } from '../../../../../../src/constants/api';
import { Shimmer } from '../../../../../../src/components/Loading';
import type { CustomerType, UpdateCustomerPayload } from '../../../../../../src/types/customer.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const MUTED = '#94a3b8';
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
      <>
        <Stack.Screen options={{ title: 'Customer', headerBackTitle: 'Back' }} />
        <CustomerDetailSkeleton />
      </>
    );
  }

  if (isError || !customer) {
    return (
      <>
        <Stack.Screen options={{ title: 'Customer' }} />
        <View style={styles.centerScreen}>
          <Feather name="alert-triangle" size={44} color={ERROR} style={{ marginBottom: 14 }} />
          <Text style={styles.errorTitle}>Couldn't load this customer</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const completionColor =
    customer.completion_percent >= 100 ? GREEN : customer.completion_percent >= 50 ? AMBER : ERROR;

  return (
    <>
      <Stack.Screen options={{ title: customer.name }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* ── Gradient hero header ── */}
        {!isEditing && (
          <LinearGradient
            colors={['#1e3a5f', '#16314f', '#0c1d30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroRow}>
              {customer.logo ? (
                <Image source={{ uri: customer.logo }} style={styles.heroLogo} />
              ) : (
                <View style={styles.heroAvatar}>
                  <Text style={styles.heroAvatarText}>
                    {(customer.name || '?').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{customer.name}</Text>
                <Text style={styles.heroType}>{customer.customer_type_display}</Text>
              </View>
              {!customer.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        )}

        {/* ── Completeness progress ── */}
        {!isEditing && (
          <View style={styles.completenessCard}>
            <View style={styles.completenessTop}>
              <View style={styles.completenessTitleRow}>
                <View style={[styles.completenessIcon, { backgroundColor: `${completionColor}18` }]}>
                  <Feather
                    name={customer.is_complete ? 'check' : 'alert-circle'}
                    size={14}
                    color={completionColor}
                  />
                </View>
                <Text style={styles.completenessTitle}>
                  {customer.is_complete ? 'Profile complete' : 'Profile incomplete'}
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
            <Text style={styles.completenessSub}>
              {customer.is_complete
                ? 'Ready to invoice'
                : customer.missing_fields?.length > 0
                ? `Missing: ${customer.missing_fields.join(', ')}`
                : 'Some details are still required'}
            </Text>
          </View>
        )}

        {/* ── Fields ── */}
        {isEditing ? (
          <EditFields form={form} update={update} fieldErrors={fieldErrors} />
        ) : (
          <ViewFields customer={customer} />
        )}

        {/* Customer edit & deactivation are admin-only — managed outside the app. */}
        <View style={styles.adminNote}>
          <Feather name="lock" size={14} color={SLATE} />
          <Text style={styles.adminNoteText}>
            Customer details can only be changed by an administrator.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

// ───────────────────────────────────────────
// View mode
// ───────────────────────────────────────────
// ───────────────────────────────────────────
// Loading skeleton — mirrors the detail layout
// ───────────────────────────────────────────
function CustomerDetailSkeleton() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Hero placeholder */}
      <View style={styles.heroSkeleton}>
        <Shimmer width={54} height={54} radius={14} base="#e6eaf0" highlight="#f3f6fa" />
        <View style={{ flex: 1, marginLeft: 14, gap: 10 }}>
          <Shimmer width="55%" height={20} radius={7} base="#e6eaf0" highlight="#f3f6fa" />
          <Shimmer width="30%" height={13} radius={6} base="#e6eaf0" highlight="#f3f6fa" />
        </View>
      </View>

      {/* Completeness placeholder */}
      <View style={styles.completenessSkeleton}>
        <Shimmer width="50%" height={15} />
        <Shimmer width="100%" height={7} radius={999} style={{ marginTop: 14 }} />
      </View>

      {/* Section placeholders */}
      {[0, 1].map((s) => (
        <View key={s} style={styles.section}>
          <Shimmer width={90} height={11} radius={5} style={{ marginBottom: 8, marginLeft: 4 }} />
          <View style={styles.sectionCard}>
            {[0, 1, 2].map((r) => (
              <View key={r} style={[styles.detailRow, r < 2 && styles.detailRowDivider]}>
                <Shimmer width="30%" height={13} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Shimmer width="45%" height={13} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// Strip a leading pictographic emoji (e.g. "🏠 No 5 …") so we can show a clean
// icon instead. Wrapped in try/catch in case the JS engine lacks the u-flag.
function stripLeadingEmoji(v?: string | null): string {
  if (!v) return '';
  try {
    return (
      v.replace(
        /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️‍\s]+/u,
        ''
      ).trim() || v
    );
  } catch {
    return v;
  }
}

type Row = { label: string; value?: string | null; icon?: keyof typeof Feather.glyphMap };

function ViewFields({ customer }: { customer: any }) {
  const taxRows: Row[] = [
    { label: 'Legal name', value: customer.legal_name },
    { label: 'TRN', value: customer.trn },
    { label: 'TRN issued', value: customer.trn_issue_date },
    { label: 'TRN expiry', value: customer.trn_expiry_date },
    { label: 'VAT number', value: customer.vat_number },
    { label: 'PEPPOL endpoint', value: customer.peppol_endpoint },
  ];
  const contactRows: Row[] = [
    { label: 'Address', value: stripLeadingEmoji(customer.formatted_address), icon: 'map-pin' },
    { label: 'Email', value: customer.email, icon: 'mail' },
    { label: 'Phone', value: customer.phone, icon: 'phone' },
  ];
  const notesRows: Row[] = [{ label: 'Notes', value: customer.notes, icon: 'file-text' }];

  // Media URLs may come back relative (e.g. "/media/...") — make them absolute
  // before handing off to the OS, otherwise the link silently does nothing.
  const openUrl = async (raw?: string | null) => {
    if (!raw) {
      Alert.alert('Not available', 'This file has not been uploaded for this customer.');
      return;
    }
    const url = /^https?:\/\//i.test(raw)
      ? raw
      : `${API_BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error('cannot open');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open', 'Unable to open this file. Please try again later.');
    }
  };

  return (
    <>
      <Section title="Business & Tax">
        {taxRows.map((row, i) => (
          <DetailRow key={row.label} row={row} isLast={i === taxRows.length - 1} />
        ))}
      </Section>

      <Section title="Contact">
        {contactRows.map((row, i) => (
          <DetailRow key={row.label} row={row} isLast={i === contactRows.length - 1} />
        ))}
      </Section>

      <Section title="Additional">
        {notesRows.map((row, i) => (
          <DetailRow key={row.label} row={row} isLast={i === notesRows.length - 1} />
        ))}
      </Section>

      {(customer.trn_document || customer.logo) && (
        <View style={styles.docsRow}>
          {customer.trn_document && (
            <TouchableOpacity style={styles.docLink} onPress={() => openUrl(customer.trn_document)} activeOpacity={0.8}>
              <Feather name="file-text" size={16} color="#2563eb" />
              <Text style={styles.docLinkText}>View TRN document</Text>
              <Feather name="download" size={14} color="#2563eb" />
            </TouchableOpacity>
          )}
          {customer.logo && (
            <TouchableOpacity style={styles.docLink} onPress={() => openUrl(customer.logo)} activeOpacity={0.8}>
              <Feather name="image" size={16} color="#2563eb" />
              <Text style={styles.docLinkText}>View logo</Text>
              <Feather name="download" size={14} color="#2563eb" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function DetailRow({ row, isLast }: { row: Row; isLast: boolean }) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowDivider]}>
      {row.icon && (
        <View style={styles.detailIcon}>
          <Feather name={row.icon} size={14} color={SLATE} />
        </View>
      )}
      <Text style={styles.detailLabel}>{row.label}</Text>
      <Text style={styles.detailValue}>{row.value || '—'}</Text>
    </View>
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

  hero: {
    borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#1e3a5f', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 14, elevation: 5,
  },

  // Loading skeleton
  heroSkeleton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  completenessSkeleton: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroLogo: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#fff' },
  heroAvatar: {
    width: 54, height: 54, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  heroName: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroType: { fontSize: 13, color: '#cbd5e1', marginTop: 3 },
  inactiveBadge: { backgroundColor: 'rgba(248,113,113,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '800', color: '#fca5a5', letterSpacing: 0.5 },

  completenessCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  completenessTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completenessTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  completenessIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  completenessTitle: { fontSize: 14.5, fontWeight: '700', color: NAVY },
  completenessPercent: { fontSize: 15, fontWeight: '800' },
  completenessSub: { fontSize: 12, color: SLATE, marginTop: 9 },
  progressTrack: {
    height: 7, borderRadius: 999, backgroundColor: '#eef2f7', marginTop: 12, overflow: 'hidden',
  },
  progressFill: { height: 7, borderRadius: 999 },

  card: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14, borderWidth: 1, borderColor: BORDER },

  // Grouped detail sections
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 },
  detailRowDivider: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailIcon: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#f4f7fb',
    alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontSize: 13.5, color: MUTED, fontWeight: '500' },
  detailValue: { fontSize: 14, color: NAVY, fontWeight: '700', flex: 1, textAlign: 'right' },

  docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16, marginTop: 2 },
  docLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f2f6ff', borderWidth: 1, borderColor: '#dbe6fb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  docLinkText: { fontSize: 13.5, color: '#2563eb', fontWeight: '700' },

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

  deactivateButton: { flexDirection: 'row', gap: 8, paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  deactivateButtonText: { color: ERROR, fontSize: 15, fontWeight: '700' },

  adminNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginTop: 2,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: BORDER,
  },
  adminNoteText: { color: SLATE, fontSize: 13, fontWeight: '500' },

  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 16 },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});